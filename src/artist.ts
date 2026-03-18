import { getApiClient, getCountryCode } from './auth';
import type { ArtistInfo, ArtistTrack, ArtistAlbum, SimilarArtist, RadioPlaylist } from './types';
export type { ArtistInfo, ArtistTrack, ArtistAlbum, SimilarArtist };

function formatDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const h = match[1] ? `${match[1]}:` : '';
  const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
  const s = (match[3] ?? '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

export async function getArtistInfoData(artistId: string, client: any, countryCode: string): Promise<ArtistInfo> {
  const { data, error } = await client.GET('/artists/{id}', {
    params: {
      path: { id: artistId },
      query: {
        countryCode,
        include: ['biography'] as any,
      },
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get artist info — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes ?? {};
  const included = (data as any).included ?? [];

  const biographyItem = included.find((item: any) => item.type === 'artistBiographies');
  const biographyText = biographyItem?.attributes?.text ?? attrs.biography?.text ?? attrs.biography;

  return {
    id: artistId,
    name: attrs.name ?? 'Unknown',
    popularity: attrs.popularity,
    handle: attrs.handle,
    biography: biographyText,
  };
}

export async function getArtistInfo(artistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const result = await getArtistInfoData(artistId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nArtist: [${result.id}] ${result.name}`);
    if (result.handle) console.log(`  Handle: ${result.handle}`);
    if (result.popularity !== undefined) console.log(`  Popularity: ${result.popularity}`);
    if (result.biography) console.log(`  Biography: ${result.biography}`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getArtistRadioData(artistId: string, client: any, countryCode: string): Promise<RadioPlaylist[]> {
  const { data, error } = await client.GET('/artists/{id}/relationships/radio' as any, {
    params: {
      path: { id: artistId },
      query: {
        countryCode,
        include: ['radio'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get artist radio — ${JSON.stringify(error)}`);
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

export async function getArtistRadio(artistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const playlists = await getArtistRadioData(artistId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(playlists, null, 2));
      return;
    }

    if (playlists.length === 0) {
      console.log(`No radio found for artist ${artistId}.`);
      return;
    }

    console.log(`\nRadio for artist ${artistId}:\n`);
    for (const p of playlists) {
      console.log(`  [${p.id}] ${p.name ?? 'Radio Mix'}${p.numberOfItems ? ` (${p.numberOfItems} tracks)` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getArtistTracksData(artistId: string, client: any, countryCode: string): Promise<ArtistTrack[]> {
  const { data, error } = await client.GET('/artists/{id}/relationships/tracks' as any, {
    params: {
      path: { id: artistId },
      query: {
        countryCode,
        'collapseBy': 'FINGERPRINT',
        include: ['tracks'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get artist tracks — ${JSON.stringify(error)}`);
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

export async function getArtistTracks(artistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const tracks = await getArtistTracksData(artistId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(tracks, null, 2));
      return;
    }

    if (tracks.length === 0) {
      console.log(`No tracks found for artist ${artistId}.`);
      return;
    }

    console.log(`\nTracks for artist ${artistId}:\n`);
    for (const t of tracks) {
      console.log(`  [${t.id}] ${t.title}${t.popularity !== undefined ? ` (popularity: ${t.popularity})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getArtistAlbumsData(artistId: string, client: any, countryCode: string): Promise<ArtistAlbum[]> {
  const { data, error } = await client.GET('/artists/{id}/relationships/albums' as any, {
    params: {
      path: { id: artistId },
      query: {
        countryCode,
        include: ['albums'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get artist albums — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included
    .filter((item: any) => item.type === 'albums')
    .map((item: any) => {
      const attrs = item.attributes as any;
      return {
        id: item.id,
        title: attrs?.title ?? 'Unknown',
        albumType: attrs?.albumType,
        releaseDate: attrs?.releaseDate,
        numberOfItems: attrs?.numberOfItems,
      };
    });
}

export async function getArtistAlbums(artistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const albums = await getArtistAlbumsData(artistId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(albums, null, 2));
      return;
    }

    if (albums.length === 0) {
      console.log(`No albums found for artist ${artistId}.`);
      return;
    }

    console.log(`\nAlbums for artist ${artistId}:\n`);
    for (const a of albums) {
      const extras = [a.albumType, a.releaseDate, a.numberOfItems !== undefined ? `${a.numberOfItems} tracks` : undefined]
        .filter(Boolean)
        .join(', ');
      console.log(`  [${a.id}] ${a.title}${extras ? ` (${extras})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getSimilarArtistsData(artistId: string, client: any, countryCode: string): Promise<SimilarArtist[]> {
  const { data, error } = await client.GET('/artists/{id}/relationships/similarArtists' as any, {
    params: {
      path: { id: artistId },
      query: {
        countryCode,
        include: ['similarArtists'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get similar artists — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included
    .filter((item: any) => item.type === 'artists')
    .map((item: any) => {
      const attrs = item.attributes as any;
      return {
        id: item.id,
        name: attrs?.name ?? 'Unknown',
        popularity: attrs?.popularity,
      };
    });
}

export async function getSimilarArtists(artistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const artists = await getSimilarArtistsData(artistId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(artists, null, 2));
      return;
    }

    if (artists.length === 0) {
      console.log(`No similar artists found for artist ${artistId}.`);
      return;
    }

    console.log(`\nSimilar artists to ${artistId}:\n`);
    for (const a of artists) {
      console.log(`  [${a.id}] ${a.name}${a.popularity !== undefined ? ` (popularity: ${a.popularity})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
