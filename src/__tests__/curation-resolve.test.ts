import { describe, it, expect, vi } from 'vitest';
import {
  resolveTracks,
  qualityFromMediaTags,
  isLossless,
} from '../curation/resolve';

interface TrackInput {
  id: string;
  title: string;
  artists?: string[];
  isrc?: string;
  popularity?: number;
  duration?: string;
  mediaTags?: string[];
}

function trackResource(t: TrackInput, artistIds: string[]) {
  return {
    id: t.id,
    type: 'tracks',
    attributes: {
      title: t.title,
      isrc: t.isrc,
      popularity: t.popularity,
      duration: t.duration,
      mediaTags: t.mediaTags ?? [],
    },
    relationships: { artists: { data: artistIds.map((id) => ({ id, type: 'artists' })) } },
  };
}

function buildIncluded(tracks: TrackInput[]) {
  const artistIdByName = new Map<string, string>();
  let n = 0;
  const artistResources: any[] = [];
  const trackResources: any[] = [];
  for (const t of tracks) {
    const ids: string[] = [];
    for (const name of t.artists ?? []) {
      let id = artistIdByName.get(name);
      if (!id) {
        id = `art-${++n}`;
        artistIdByName.set(name, id);
        artistResources.push({ id, type: 'artists', attributes: { name } });
      }
      ids.push(id);
    }
    trackResources.push(trackResource(t, ids));
  }
  return [...artistResources, ...trackResources];
}

interface MockConfig {
  searchByQuery?: Record<string, TrackInput[]>;
  isrcByCode?: Record<string, TrackInput[]>;
  manifestFormatsById?: Record<string, string[]>;
}

function makeClient(cfg: MockConfig) {
  const GET = vi.fn(async (path: string, opts: any): Promise<any> => {
    if (path === '/searchResults/{id}') {
      const q = opts?.params?.path?.id;
      const tracks = cfg.searchByQuery?.[q] ?? [];
      return { data: { included: buildIncluded(tracks) } };
    }
    if (path === '/tracks') {
      const isrc = opts?.params?.query?.['filter[isrc]']?.[0];
      const tracks = cfg.isrcByCode?.[isrc] ?? [];
      const included = buildIncluded(tracks);
      const trackResources = included.filter((r) => r.type === 'tracks');
      const artistResources = included.filter((r) => r.type === 'artists');
      return { data: { data: trackResources, included: artistResources } };
    }
    if (path === '/trackManifests/{id}') {
      const id = opts?.params?.path?.id;
      return { data: { data: { attributes: { formats: cfg.manifestFormatsById?.[id] ?? [] } } } };
    }
    return { data: { data: [] } };
  });
  return { GET };
}

describe('quality helpers', () => {
  it('maps mediaTags to quality tiers', () => {
    expect(qualityFromMediaTags(['LOSSLESS'])).toBe('LOSSLESS');
    expect(qualityFromMediaTags(['HIRES_LOSSLESS', 'LOSSLESS'])).toBe('HI_RES_LOSSLESS');
    expect(qualityFromMediaTags(['DOLBY_ATMOS'])).toBe('UNKNOWN');
    expect(qualityFromMediaTags([])).toBe('UNKNOWN');
    expect(qualityFromMediaTags(undefined)).toBe('UNKNOWN');
  });
  it('isLossless', () => {
    expect(isLossless('LOSSLESS')).toBe(true);
    expect(isLossless('HI_RES_LOSSLESS')).toBe(true);
    expect(isLossless('HIGH')).toBe(false);
    expect(isLossless('UNKNOWN')).toBe(false);
  });
});

describe('resolveTracks — matching', () => {
  it('resolves by artist + title and attaches quality from mediaTags', async () => {
    const client = makeClient({
      searchByQuery: {
        'Daft Punk Get Lucky': [
          { id: 'wrong', title: 'Get Lucky (Remix)', artists: ['Other'], popularity: 0.9, mediaTags: [] },
          { id: 'right', title: 'Get Lucky', artists: ['Daft Punk'], popularity: 0.8, mediaTags: ['LOSSLESS'] },
        ],
      },
    });

    const r = await resolveTracks(client, 'US', [{ artist: 'Daft Punk', title: 'Get Lucky' }]);

    expect(r.tracks).toHaveLength(1);
    expect(r.tracks[0].trackId).toBe('right');
    expect(r.tracks[0].quality).toBe('LOSSLESS');
    expect(r.tracks[0].match).toBe('exact');
    expect(r.notFound).toHaveLength(0);
  });

  it('matches across "feat." / remaster variations', async () => {
    const client = makeClient({
      searchByQuery: {
        'Queen Under Pressure': [
          { id: 't1', title: 'Under Pressure (feat. David Bowie) - Remastered 2011', artists: ['Queen'], mediaTags: ['HIRES_LOSSLESS'] },
        ],
      },
    });
    const r = await resolveTracks(client, 'US', [{ artist: 'Queen', title: 'Under Pressure' }]);
    expect(r.tracks[0]?.trackId).toBe('t1');
    expect(r.tracks[0]?.quality).toBe('HI_RES_LOSSLESS');
  });

  it('prefers an exact ISRC match over title search', async () => {
    const client = makeClient({
      isrcByCode: { USRC12345678: [{ id: 'isrc-hit', title: 'Anything', artists: ['X'], isrc: 'USRC12345678', mediaTags: ['LOSSLESS'] }] },
    });
    const r = await resolveTracks(client, 'US', [{ title: 'Whatever', isrc: 'USRC12345678' }]);
    expect(r.tracks[0].trackId).toBe('isrc-hit');
    expect(r.tracks[0].match).toBe('exact');
  });

  it('reports not-found when no confident match exists', async () => {
    const client = makeClient({
      searchByQuery: { 'Nobody Nonexistent Song': [{ id: 'x', title: 'Completely Different', artists: ['Someone Else'], mediaTags: [] }] },
    });
    const r = await resolveTracks(client, 'US', [{ artist: 'Nobody', title: 'Nonexistent Song' }]);
    expect(r.tracks).toHaveLength(0);
    expect(r.notFound).toHaveLength(1);
    expect(r.notFound[0].query.title).toBe('Nonexistent Song');
  });
});

describe('resolveTracks — order, dedupe, filters', () => {
  it('preserves requested order and dedupes by track id', async () => {
    const client = makeClient({
      searchByQuery: {
        'A SongA': [{ id: 't-a', title: 'SongA', artists: ['A'], mediaTags: ['LOSSLESS'] }],
        'B SongB': [{ id: 't-b', title: 'SongB', artists: ['B'], mediaTags: ['LOSSLESS'] }],
        'A SongA again': [{ id: 't-a', title: 'SongA', artists: ['A'], mediaTags: ['LOSSLESS'] }],
      },
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'SongA' },
      { artist: 'B', title: 'SongB' },
      { artist: 'A', title: 'SongA again' },
    ]);
    expect(r.tracks.map((t) => t.trackId)).toEqual(['t-a', 't-b']);
    expect(r.stats.duplicatesRemoved).toBe(1);
  });

  it('losslessOnly moves non-lossless + unconfirmed tracks to filteredOut', async () => {
    const client = makeClient({
      searchByQuery: {
        'A Lossy': [{ id: 'lossy', title: 'Lossy', artists: ['A'], mediaTags: [] }],
        'B Hifi': [{ id: 'hifi', title: 'Hifi', artists: ['B'], mediaTags: ['LOSSLESS'] }],
      },
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'Lossy' },
      { artist: 'B', title: 'Hifi' },
    ], { losslessOnly: true });

    expect(r.tracks.map((t) => t.trackId)).toEqual(['hifi']);
    expect(r.filteredOut.map((t) => t.trackId)).toEqual(['lossy']);
    expect(r.filteredOut[0].filterReason).toContain('unconfirmed');
    expect(r.notes.join(' ')).toContain('could not be confirmed');
  });

  it('audiophile mode prefers the lossless candidate among equal title/artist matches', async () => {
    // Same track, two entries: lossy is more popular (would win on the tiebreaker) but lossless
    // should be chosen when losslessOnly is set, so the track survives the filter.
    const client = makeClient({
      searchByQuery: {
        'A Song': [
          { id: 'lossy', title: 'Song', artists: ['A'], popularity: 0.95, mediaTags: [] },
          { id: 'flac', title: 'Song', artists: ['A'], popularity: 0.8, mediaTags: ['LOSSLESS'] },
        ],
      },
    });
    const r = await resolveTracks(client, 'US', [{ artist: 'A', title: 'Song' }], { losslessOnly: true });
    expect(r.tracks).toHaveLength(1);
    expect(r.tracks[0].trackId).toBe('flac');
    expect(r.filteredOut).toHaveLength(0);
  });

  it('deep-cuts excludes tracks at/above the popularity threshold', async () => {
    const client = makeClient({
      searchByQuery: {
        'A Hit': [{ id: 'hit', title: 'Hit', artists: ['A'], popularity: 0.95, mediaTags: ['LOSSLESS'] }],
        'A Cut': [{ id: 'cut', title: 'Cut', artists: ['A'], popularity: 0.2, mediaTags: ['LOSSLESS'] }],
      },
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'Hit' },
      { artist: 'A', title: 'Cut' },
    ], { excludeHitsAbovePopularity: 0.7 });

    expect(r.tracks.map((t) => t.trackId)).toEqual(['cut']);
    expect(r.filteredOut[0].trackId).toBe('hit');
    expect(r.filteredOut[0].filterReason).toContain('deep cuts');
  });

  it('truncates to maxItems with a note', async () => {
    const client = makeClient({
      searchByQuery: {
        'A One': [{ id: '1', title: 'One', artists: ['A'], mediaTags: ['LOSSLESS'] }],
        'A Two': [{ id: '2', title: 'Two', artists: ['A'], mediaTags: ['LOSSLESS'] }],
      },
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'One' },
      { artist: 'A', title: 'Two' },
    ], { maxItems: 1 });
    expect(r.tracks).toHaveLength(1);
    expect(r.stats.truncated).toBe(true);
    expect(r.notes.join(' ')).toContain('first 1 of 2');
  });

  it('verifyQuality resolves UNKNOWN via manifest fallback', async () => {
    const client = makeClient({
      searchByQuery: { 'A Mystery': [{ id: 'm1', title: 'Mystery', artists: ['A'], mediaTags: [] }] },
      manifestFormatsById: { m1: ['HEAACV1', 'AACLC', 'FLAC'] },
    });
    const r = await resolveTracks(client, 'US', [{ artist: 'A', title: 'Mystery' }], { verifyQuality: true });
    expect(r.tracks[0].quality).toBe('LOSSLESS');
    // manifest endpoint was consulted
    expect(client.GET.mock.calls.some((c) => c[0] === '/trackManifests/{id}')).toBe(true);
  });

  it('tolerates a search API error for one item (reports not-found, continues)', async () => {
    const client = makeClient({ searchByQuery: { 'B Good': [{ id: 'g', title: 'Good', artists: ['B'], mediaTags: ['LOSSLESS'] }] } });
    const realGet = client.GET.getMockImplementation()!;
    client.GET.mockImplementation(async (path: string, opts: any) => {
      if (path === '/searchResults/{id}' && opts?.params?.path?.id === 'A Bad') {
        return { data: null, error: { status: 429 } };
      }
      return realGet(path, opts);
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'Bad' },
      { artist: 'B', title: 'Good' },
    ]);
    expect(r.tracks.map((t) => t.trackId)).toEqual(['g']);
    expect(r.notFound.map((n) => n.query.title)).toEqual(['Bad']);
  });
});

describe('resolveTracks — review hardening', () => {
  it('stops at the wall-clock budget and reports unresolved items (no hang)', async () => {
    const slow = {
      GET: vi.fn(async (_path: string, opts: any): Promise<any> => {
        await new Promise((r) => setTimeout(r, 15));
        const q = opts?.params?.path?.id as string;
        const artist = q.split(' ')[0];
        const title = q.split(' ').slice(1).join(' ');
        return { data: { included: buildIncluded([{ id: q, title, artists: [artist], mediaTags: ['LOSSLESS'] }]) } };
      }),
    };
    const r = await resolveTracks(
      slow,
      'US',
      [
        { artist: 'A', title: 'One' },
        { artist: 'B', title: 'Two' },
        { artist: 'C', title: 'Three' },
      ],
      { deadlineMs: 1 },
    );
    expect(r.stats.timedOut).toBe(true);
    expect(r.tracks.length).toBeLessThan(3);
    expect(r.notFound.some((n) => n.reason.includes('time budget'))).toBe(true);
    expect(r.notes.join(' ')).toContain('time budget');
  });

  it('audiophile with no quality tags surfaces a clear "no quality metadata" note (not "0 lossless")', async () => {
    const client = makeClient({
      searchByQuery: {
        'A One': [{ id: '1', title: 'One', artists: ['A'], mediaTags: [] }],
        'B Two': [{ id: '2', title: 'Two', artists: ['B'], mediaTags: [] }],
      },
    });
    const r = await resolveTracks(client, 'US', [
      { artist: 'A', title: 'One' },
      { artist: 'B', title: 'Two' },
    ], { losslessOnly: true });
    expect(r.tracks).toHaveLength(0);
    expect(r.filteredOut).toHaveLength(2);
    expect(r.notes.join(' ')).toContain('no audio-quality tags');
  });

  it('does not match on short substrings (Go ⊄ Going, Eve ⊄ Steve)', async () => {
    const client = makeClient({
      searchByQuery: { 'Eve Go': [{ id: 'x', title: 'Going', artists: ['Steve'], mediaTags: ['LOSSLESS'] }] },
    });
    const r = await resolveTracks(client, 'US', [{ artist: 'Eve', title: 'Go' }]);
    expect(r.tracks).toHaveLength(0);
    expect(r.notFound).toHaveLength(1);
  });

  it('distinguishes a transient (429) lookup failure from a genuine miss', async () => {
    const client = makeClient({});
    client.GET.mockImplementation(async () => ({ data: null, error: { status: 429 } }));
    const r = await resolveTracks(client, 'US', [{ artist: 'A', title: 'X' }]);
    expect(r.notFound[0].reason).toContain('rate-limited');
  });
});
