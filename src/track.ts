import { getApiClient, getCountryCode } from './auth';
import type { TrackInfo, SimilarTrack, RadioPlaylist } from './types';
export type { TrackInfo, SimilarTrack };

function formatDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const h = match[1] ? `${match[1]}:` : '';
  const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
  const s = (match[3] ?? '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

export async function getTrackInfoData(trackId: string, client: any, countryCode: string): Promise<TrackInfo> {
  const { data, error } = await client.GET('/tracks/{id}', {
    params: {
      path: { id: trackId },
      query: {
        countryCode,
        include: ['artists', 'albums'] as any,
      },
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get track info — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes ?? {};
  const included = (data as any).included ?? [];

  const artists = included
    .filter((item: any) => item.type === 'artists')
    .map((item: any) => item.attributes?.name ?? item.id);

  const album = included.find((item: any) => item.type === 'albums');
  const albumName = album?.attributes?.title ?? undefined;

  let coverUrl: string | undefined;
  if (album?.id) {
    try {
      const { data: artData } = await client.GET('/albums/{id}/relationships/coverArt' as any, {
        params: {
          path: { id: album.id },
          query: { countryCode, include: ['coverArt'] } as any,
        },
      });
      const artwork = ((artData as any)?.included ?? []).find((i: any) => i.type === 'artworks');
      const files = artwork?.attributes?.files ?? [];
      const preferred = files.find((f: any) => f.meta?.width === 640) ?? files[0];
      coverUrl = preferred?.href;
    } catch {}
  }

  return {
    id: trackId,
    title: attrs.title ?? 'Unknown',
    artists,
    album: albumName,
    duration: formatDuration(attrs.duration),
    isrc: attrs.isrc,
    bpm: attrs.bpm,
    key: attrs.key,
    popularity: attrs.popularity,
    explicit: attrs.explicit,
    coverUrl,
  };
}

export async function getTrackInfo(trackId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const result = await getTrackInfoData(trackId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nTrack: [${result.id}] ${result.title}`);
    if (result.artists.length > 0) console.log(`  Artists: ${result.artists.join(', ')}`);
    if (result.album) console.log(`  Album: ${result.album}`);
    if (result.duration) console.log(`  Duration: ${result.duration}`);
    if (result.isrc) console.log(`  ISRC: ${result.isrc}`);
    if (result.bpm !== undefined) console.log(`  BPM: ${result.bpm}`);
    if (result.key !== undefined) console.log(`  Key: ${result.key}`);
    if (result.popularity !== undefined) console.log(`  Popularity: ${result.popularity}`);
    if (result.explicit !== undefined) console.log(`  Explicit: ${result.explicit}`);
    if (result.coverUrl) console.log(`  Cover: ${result.coverUrl}`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getTrackRadioData(trackId: string, client: any, countryCode: string): Promise<RadioPlaylist[]> {
  const { data, error } = await client.GET('/tracks/{id}/relationships/radio' as any, {
    params: {
      path: { id: trackId },
      query: {
        countryCode,
        include: ['radio'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get track radio — ${JSON.stringify(error)}`);
  }

  const radioData = (data as any).data ?? [];
  const included = (data as any).included ?? [];

  return radioData.map((item: any) => {
    const incl = included.find((i: any) => i.id === item.id && i.type === 'playlists');
    const attrs = incl?.attributes ?? {};
    return {
      id: item.id,
      type: item.type,
      name: attrs.name,
      numberOfItems: attrs.numberOfItems,
    };
  });
}

export async function getTrackRadio(trackId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const playlists = await getTrackRadioData(trackId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(playlists, null, 2));
      return;
    }

    if (playlists.length === 0) {
      console.log(`No radio found for track ${trackId}.`);
      return;
    }

    console.log(`\nRadio for track ${trackId}:\n`);
    for (const p of playlists) {
      console.log(`  [${p.id}] ${p.name ?? 'Radio Mix'}${p.numberOfItems ? ` (${p.numberOfItems} tracks)` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

interface TrackByIsrcResult {
  id: string;
  title: string;
  artists: string[];
  duration: string;
  isrc?: string;
  popularity?: number;
}

export async function getTrackByIsrcData(isrc: string, client: any, countryCode: string): Promise<TrackByIsrcResult[]> {
  const { data, error } = await client.GET('/tracks' as any, {
    params: {
      query: {
        countryCode,
        'filter[isrc]': [isrc] as any,
        include: ['artists'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get track by ISRC — ${JSON.stringify(error)}`);
  }

  const items = (data as any).data ?? [];
  const included = (data as any).included ?? [];

  return items.map((item: any) => {
    const attrs = item.attributes as any;
    const artistRels = item.relationships?.artists?.data ?? [];
    const artistNames = artistRels.map((rel: any) => {
      const artist = included.find((inc: any) => inc.type === 'artists' && inc.id === rel.id);
      return artist?.attributes?.name ?? rel.id;
    });
    return {
      id: item.id,
      title: attrs?.title ?? 'Unknown',
      artists: artistNames,
      duration: formatDuration(attrs?.duration),
      isrc: attrs?.isrc,
      popularity: attrs?.popularity,
    };
  });
}

export async function getTrackByIsrc(isrc: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const tracks = await getTrackByIsrcData(isrc, client, countryCode);

    if (json) {
      console.log(JSON.stringify(tracks, null, 2));
      return;
    }

    if (tracks.length === 0) {
      console.log(`No tracks found for ISRC ${isrc}.`);
      return;
    }

    console.log(`\nTracks matching ISRC ${isrc}:\n`);
    for (const t of tracks) {
      const artistStr = t.artists.length > 0 ? ` by ${t.artists.join(', ')}` : '';
      const extras = [t.duration, t.popularity !== undefined ? `popularity: ${t.popularity}` : undefined]
        .filter(Boolean)
        .join(', ');
      console.log(`  [${t.id}] ${t.title}${artistStr}${extras ? ` (${extras})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getSimilarTracksData(trackId: string, client: any, countryCode: string): Promise<SimilarTrack[]> {
  const { data, error } = await client.GET('/tracks/{id}/relationships/similarTracks' as any, {
    params: {
      path: { id: trackId },
      query: {
        countryCode,
        include: ['similarTracks'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get similar tracks — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included
    .filter((item: any) => item.type === 'tracks')
    .map((item: any) => {
      const attrs = item.attributes as any;
      return {
        id: item.id,
        title: attrs?.title ?? 'Unknown',
        duration: formatDuration(attrs?.duration),
        isrc: attrs?.isrc,
        popularity: attrs?.popularity,
      };
    });
}

export async function getSimilarTracks(trackId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const tracks = await getSimilarTracksData(trackId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(tracks, null, 2));
      return;
    }

    if (tracks.length === 0) {
      console.log(`No similar tracks found for track ${trackId}.`);
      return;
    }

    console.log(`\nSimilar tracks to ${trackId}:\n`);
    for (const t of tracks) {
      const extras = [t.duration, t.popularity !== undefined ? `popularity: ${t.popularity}` : undefined]
        .filter(Boolean)
        .join(', ');
      console.log(`  [${t.id}] ${t.title}${extras ? ` (${extras})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
