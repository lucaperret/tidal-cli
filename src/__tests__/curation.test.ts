import { describe, it, expect, vi } from 'vitest';

import { analyzeLibraryData, buildLibrarySummary } from '../curation/aggregate';
import type { LibraryAnalysis } from '../curation/aggregate';
import { appResponse } from '../curation/respond';

// Fixed "now" so staleness is deterministic.
const NOW = Date.parse('2026-06-16T00:00:00Z');

// --- A configurable mock Tidal client. Routes client.GET by path (+ playlist id / cursor). ---
interface MockData {
  ownedPlaylists?: any[]; // JSON:API resource objects for GET /playlists
  favoritedPlaylists?: any[]; // included playlists for userCollectionPlaylists
  savedItems?: any[]; // included items for userCollectionSaveForLaters
  recentlyAddedTracks?: any[]; // included tracks for userCollectionTracks
  // playlist id -> array of pages; each page: { data: [...refs], included: [...tracks], next?: cursor }
  membership?: Record<string, Array<{ ids: string[]; titles?: Record<string, string>; next?: string }>>;
  // paths that should reject (to test graceful degradation)
  failPaths?: string[];
}

function makeClient(d: MockData) {
  const GET = vi.fn(async (path: string, opts: any) => {
    if (d.failPaths?.includes(path)) {
      return { data: null, error: { status: 500 } };
    }

    // Relationship endpoints return refs in `data` + resources in `included`. These readers map
    // `included`; a sentinel ref for empty collections avoids fetchAllPages' retry-on-empty in tests.
    const collection = (items: any[]) => ({
      data: {
        data: items.length ? items.map((i) => ({ id: i.id, type: i.type })) : [{ id: '__end__', type: '__end__' }],
        included: items,
        links: {},
      },
    });

    if (path === '/playlists') {
      return { data: { data: d.ownedPlaylists ?? [] } };
    }
    if (path === '/userCollectionPlaylists/{id}/relationships/items') {
      return collection(d.favoritedPlaylists ?? []);
    }
    if (path === '/userCollectionSaveForLaters/{id}/relationships/items') {
      return collection(d.savedItems ?? []);
    }
    if (path === '/userCollectionTracks/{id}/relationships/items') {
      return collection(d.recentlyAddedTracks ?? []);
    }
    if (path === '/playlists/{id}/relationships/items') {
      const id = opts?.params?.path?.id;
      const cursor = opts?.params?.query?.['page[cursor]'];
      const pages = d.membership?.[id] ?? [];
      const pageIndex = cursor ? Number(cursor) : 0;
      const page = pages[pageIndex];
      if (!page) return { data: { data: [], included: [] } };
      return {
        data: {
          data: page.ids.map((tid) => ({ id: tid, type: 'tracks', meta: { itemId: `item-${tid}` } })),
          included: Object.entries(page.titles ?? {}).map(([tid, title]) => ({
            id: tid,
            type: 'tracks',
            attributes: { title },
          })),
          links: page.next ? { next: `/playlists/${id}/relationships/items?page[cursor]=${page.next}` } : {},
        },
      };
    }
    return { data: { data: [] } };
  });

  return { GET, POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() };
}

function ownedPlaylist(id: string, name: string, numberOfItems: number, lastModifiedAt?: string) {
  return { id, attributes: { name, numberOfItems, lastModifiedAt, createdAt: lastModifiedAt } };
}

describe('analyzeLibraryData — cheap aggregates', () => {
  it('computes totals, size distribution and staleness', async () => {
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-1', 'Workout Mix', 30, '2026-06-10T00:00:00Z'),
        ownedPlaylist('pl-2', 'Old Vibes', 5, '2024-01-01T00:00:00Z'),
        ownedPlaylist('pl-3', 'Empty', 0, '2026-05-01T00:00:00Z'),
      ],
      favoritedPlaylists: [
        { id: 'fav-1', type: 'playlists', attributes: { name: 'Editorial', numberOfItems: 50 } },
      ],
      savedItems: [
        { id: 'art-1', type: 'artists', attributes: { name: 'Aphex Twin' } },
        { id: 'alb-1', type: 'albums', attributes: { title: 'Selected Ambient Works' } },
        { id: 'sv-trk-1', type: 'tracks', attributes: { title: 'Saved Song' } },
      ],
      recentlyAddedTracks: [
        { id: 'rt-1', type: 'tracks', attributes: { title: 'Recent A' } },
        { id: 'rt-2', type: 'tracks', attributes: { title: 'Recent B' } },
      ],
      membership: { 'pl-1': [{ ids: [] }], 'pl-2': [{ ids: [] }], 'pl-3': [{ ids: [] }] },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW, pageRetryDelayMs: 0 });

    expect(a.totals.ownedPlaylists).toBe(3);
    expect(a.totals.favoritedPlaylists).toBe(1);
    expect(a.totals.savedForLaterItems).toBe(3);
    expect(a.totals.savedByType).toEqual({ artists: 1, albums: 1, tracks: 1 });

    expect(a.playlists.totalTracks).toBe(35);
    expect(a.playlists.averageSize).toBe(12); // round(35/3)
    expect(a.playlists.emptyCount).toBe(1);
    expect(a.playlists.largest).toEqual({ id: 'pl-1', name: 'Workout Mix', trackCount: 30 });
    expect(a.playlists.smallest).toEqual({ id: 'pl-3', name: 'Empty', trackCount: 0 });
    // sizes sorted desc
    expect(a.playlists.sizes.map((s) => s.name)).toEqual(['Workout Mix', 'Old Vibes', 'Empty']);

    // stalest = oldest lastModifiedAt first
    expect(a.playlists.stalest[0].name).toBe('Old Vibes');
    expect(a.playlists.stalest[0].daysSinceModified).toBeGreaterThan(800);
    expect(a.playlists.recentlyModified[0].name).toBe('Workout Mix');

    expect(a.savedArtists).toEqual(['Aphex Twin']);
    expect(a.recentActivity.recentlyAddedTracks).toBe(2);
  });

  it('reads only the 4 cheap endpoints when deep=false (no membership reads)', async () => {
    const client = makeClient({
      ownedPlaylists: [ownedPlaylist('pl-1', 'A', 10, '2026-06-01T00:00:00Z')],
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW, deep: false });

    expect(a.coverage.analyzedPlaylists).toBe(0);
    expect(a.duplicates.count).toBe(0);
    expect(a.forgottenGems.count).toBe(0);
    const membershipCalls = client.GET.mock.calls.filter(
      (c) => c[0] === '/playlists/{id}/relationships/items',
    );
    expect(membershipCalls).toHaveLength(0);
  });
});

describe('analyzeLibraryData — deep pass (duplicates + forgotten gems)', () => {
  it('detects cross-playlist duplicates with titles and playlist names', async () => {
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-1', 'Chill', 2, '2026-06-01T00:00:00Z'),
        ownedPlaylist('pl-2', 'Focus', 2, '2026-06-02T00:00:00Z'),
      ],
      membership: {
        'pl-1': [{ ids: ['t-shared', 't-only1'], titles: { 't-shared': 'Shared Song', 't-only1': 'Solo One' } }],
        'pl-2': [{ ids: ['t-shared', 't-only2'], titles: { 't-shared': 'Shared Song', 't-only2': 'Solo Two' } }],
      },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });

    expect(a.duplicates.count).toBe(1);
    expect(a.duplicates.items[0]).toEqual({
      trackId: 't-shared',
      title: 'Shared Song',
      inPlaylists: expect.arrayContaining(['Chill', 'Focus']),
    });
    expect(a.coverage.analyzedPlaylists).toBe(2);
    expect(a.coverage.partialMembership).toBe(false);
  });

  it('flags saved-for-later tracks that are in no playlist as forgotten gems', async () => {
    const client = makeClient({
      ownedPlaylists: [ownedPlaylist('pl-1', 'Main', 1, '2026-06-01T00:00:00Z')],
      savedItems: [
        { id: 't-inplaylist', type: 'tracks', attributes: { title: 'Already Listed' } },
        { id: 't-forgotten', type: 'tracks', attributes: { title: 'Forgotten Gem' } },
      ],
      membership: {
        'pl-1': [{ ids: ['t-inplaylist'], titles: { 't-inplaylist': 'Already Listed' } }],
      },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });

    expect(a.forgottenGems.count).toBe(1);
    expect(a.forgottenGems.items).toEqual([{ trackId: 't-forgotten', title: 'Forgotten Gem' }]);
  });

  it('follows cursor pagination across pages', async () => {
    const client = makeClient({
      ownedPlaylists: [ownedPlaylist('pl-1', 'Big', 4, '2026-06-01T00:00:00Z')],
      membership: {
        'pl-1': [
          { ids: ['t-a', 't-b'], titles: { 't-a': 'A', 't-b': 'B' }, next: '1' },
          { ids: ['t-c', 't-d'], titles: { 't-c': 'C', 't-d': 'D' } },
        ],
      },
      savedItems: [{ id: 't-d', type: 'tracks', attributes: { title: 'D' } }],
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });

    // t-d came from page 2 → not a forgotten gem (membership covered both pages)
    expect(a.forgottenGems.count).toBe(0);
    expect(a.coverage.partialMembership).toBe(false);
    const calls = client.GET.mock.calls.filter((c) => c[0] === '/playlists/{id}/relationships/items');
    expect(calls).toHaveLength(2);
  });

  it('skips known-empty playlists (no membership read) in the deep pass', async () => {
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-full', 'Full', 2, '2026-06-01T00:00:00Z'),
        ownedPlaylist('pl-empty', 'Empty', 0, '2026-06-02T00:00:00Z'),
      ],
      membership: { 'pl-full': [{ ids: ['t1', 't2'], titles: { t1: 'A', t2: 'B' } }] },
    });

    await analyzeLibraryData(client, 'US', { now: NOW, pageRetryDelayMs: 0 });

    const membershipCalls = client.GET.mock.calls
      .filter((c) => c[0] === '/playlists/{id}/relationships/items')
      .map((c) => c[1].params.path.id);
    expect(membershipCalls).toContain('pl-full');
    expect(membershipCalls).not.toContain('pl-empty'); // empty playlist never read
  });

  it('detects cross-playlist duplicates even when playlists share a name', async () => {
    // Regression: keying by playlist name (not id) would collapse same-named playlists.
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-1', 'Favorites', 1, '2026-06-01T00:00:00Z'),
        ownedPlaylist('pl-2', 'Favorites', 1, '2026-06-02T00:00:00Z'),
      ],
      membership: {
        'pl-1': [{ ids: ['t-shared'], titles: { 't-shared': 'Shared' } }],
        'pl-2': [{ ids: ['t-shared'], titles: { 't-shared': 'Shared' } }],
      },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });

    expect(a.duplicates.count).toBe(1);
    expect(a.duplicates.items[0].trackId).toBe('t-shared');
    expect(a.duplicates.items[0].inPlaylists).toHaveLength(2);
  });

  it('flags partialMembership (not silent drop) when a playlist read returns an API error', async () => {
    // Regression: a page-0 {error} response must mark coverage partial, otherwise a saved track
    // living in that unreadable playlist would be falsely reported as a forgotten gem.
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-ok', 'Readable', 1, '2026-06-01T00:00:00Z'),
        ownedPlaylist('pl-bad', 'Unreadable', 1, '2026-06-02T00:00:00Z'),
      ],
      membership: { 'pl-ok': [{ ids: ['t-ok'] }] }, // pl-bad has no entry → returns empty
      failPaths: [], // we simulate the error via a custom GET below
    });
    // Make pl-bad's membership read fail with an API error.
    const realGet = client.GET.getMockImplementation()!;
    client.GET.mockImplementation(async (path: string, opts: any) => {
      if (path === '/playlists/{id}/relationships/items' && opts?.params?.path?.id === 'pl-bad') {
        return { data: null, error: { status: 500 } };
      }
      return realGet(path, opts);
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW, pageRetryDelayMs: 0 });

    expect(a.coverage.partialMembership).toBe(true);
    expect(a.notes.some((n) => n.toLowerCase().includes('partial'))).toBe(true);
  });

  it('truncates to maxPlaylists and records a note', async () => {
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-1', 'One', 1, '2026-06-01T00:00:00Z'),
        ownedPlaylist('pl-2', 'Two', 1, '2026-06-02T00:00:00Z'),
        ownedPlaylist('pl-3', 'Three', 1, '2026-06-03T00:00:00Z'),
      ],
      membership: {
        'pl-1': [{ ids: ['a'] }],
        'pl-2': [{ ids: ['b'] }],
        'pl-3': [{ ids: ['c'] }],
      },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW, maxPlaylists: 2 });

    expect(a.coverage.truncatedPlaylists).toBe(true);
    expect(a.coverage.analyzedPlaylists).toBe(2);
    expect(a.coverage.totalPlaylists).toBe(3);
    expect(a.notes.some((n) => n.includes('first 2 of 3'))).toBe(true);
  });
});

describe('analyzeLibraryData — resilience', () => {
  it('degrades gracefully when a reader fails, recording a note instead of throwing', async () => {
    const client = makeClient({
      failPaths: ['/playlists'],
      savedItems: [{ id: 't-1', type: 'tracks', attributes: { title: 'Saved' } }],
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });

    expect(a.totals.ownedPlaylists).toBe(0);
    expect(a.totals.savedForLaterItems).toBe(1);
    expect(a.notes.some((n) => n.toLowerCase().includes('playlists'))).toBe(true);
  });
});

describe('buildLibrarySummary — clean text channel', () => {
  it('contains no raw IDs and no ISO timestamps', async () => {
    const client = makeClient({
      ownedPlaylists: [
        ownedPlaylist('pl-1', 'Chill', 2, '2024-01-01T00:00:00Z'),
        ownedPlaylist('pl-2', 'Focus', 2, '2026-06-02T00:00:00Z'),
      ],
      savedItems: [
        { id: 'art-1', type: 'artists', attributes: { name: 'Boards of Canada' } },
        { id: 't-forgotten', type: 'tracks', attributes: { title: 'Forgotten Gem' } },
      ],
      membership: {
        'pl-1': [{ ids: ['t-shared'], titles: { 't-shared': 'Shared' } }],
        'pl-2': [{ ids: ['t-shared'], titles: { 't-shared': 'Shared' } }],
      },
    });

    const a = await analyzeLibraryData(client, 'US', { now: NOW });
    const summary = buildLibrarySummary(a);

    // No raw track/playlist IDs leak into the model-facing text.
    expect(summary).not.toMatch(/\bt-shared\b/);
    expect(summary).not.toMatch(/\bpl-\d/);
    expect(summary).not.toMatch(/\bart-1\b/);
    // No ISO timestamps.
    expect(summary).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    // But it conveys the real signals in prose.
    expect(summary).toContain('Chill');
    expect(summary).toContain('Boards of Canada');
    expect(summary.toLowerCase()).toContain('forgotten gem');
    expect(summary).toContain('appear in more than one playlist');
  });
});

describe('appResponse — cross-client shape', () => {
  const data: Record<string, unknown> = { foo: 'bar' };

  it('returns clean content + structuredContent and no _meta without a component', () => {
    const r = appResponse({ summary: 'hello', data });
    expect(r.content).toEqual([{ type: 'text', text: 'hello' }]);
    expect(r.structuredContent).toBe(data);
    expect(r._meta).toBeUndefined();
  });

  it('attaches the ChatGPT outputTemplate when a component is provided', () => {
    const r = appResponse({ summary: 'hi', data, component: 'ui://tidal/library-insights' });
    expect(r._meta).toEqual({ 'openai/outputTemplate': 'ui://tidal/library-insights' });
  });

  it('merges extra meta passthrough', () => {
    const r = appResponse({ summary: 'hi', data, component: 'ui://x', meta: { 'x/flag': true } });
    expect(r._meta).toEqual({ 'x/flag': true, 'openai/outputTemplate': 'ui://x' });
  });
});

// Type-level guard: ensure the shape stays an object the model can read.
describe('LibraryAnalysis shape', () => {
  it('is a structured object suitable for structuredContent', async () => {
    const client = makeClient({ ownedPlaylists: [], membership: {} });
    const a: LibraryAnalysis = await analyzeLibraryData(client, 'US', { now: NOW });
    expect(typeof a).toBe('object');
    expect(Array.isArray(a.duplicates.items)).toBe(true);
    expect(Array.isArray(a.notes)).toBe(true);
  });
});
