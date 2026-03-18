import { getApiClient, getCountryCode } from './auth';
import type { AlbumInfo, AlbumResult } from './types';
export type { AlbumInfo, AlbumResult };

function formatDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const h = match[1] ? `${match[1]}:` : '';
  const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
  const s = (match[3] ?? '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

export async function getAlbumInfoData(albumId: string, client: any, countryCode: string): Promise<AlbumInfo> {
  const { data, error } = await client.GET('/albums/{id}', {
    params: {
      path: { id: albumId },
      query: {
        countryCode,
        include: ['artists', 'coverArt'] as any,
      },
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get album info — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes ?? {};
  const included = (data as any).included ?? [];

  const artists = included
    .filter((item: any) => item.type === 'artists')
    .map((item: any) => item.attributes?.name ?? item.id);

  const artwork = included.find((item: any) => item.type === 'artworks');
  const files = artwork?.attributes?.files ?? [];
  const preferred = files.find((f: any) => f.meta?.width === 640) ?? files[0];
  const coverUrl = preferred?.href;

  return {
    id: albumId,
    title: attrs.title ?? 'Unknown',
    artists,
    albumType: attrs.albumType,
    releaseDate: attrs.releaseDate,
    numberOfItems: attrs.numberOfItems,
    duration: formatDuration(attrs.duration),
    popularity: attrs.popularity,
    explicit: attrs.explicit,
    barcodeId: attrs.barcodeId,
    coverUrl,
  };
}

export async function getAlbumInfo(albumId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const result = await getAlbumInfoData(albumId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nAlbum: [${result.id}] ${result.title}`);
    if (result.artists.length > 0) console.log(`  Artists: ${result.artists.join(', ')}`);
    if (result.albumType) console.log(`  Type: ${result.albumType}`);
    if (result.releaseDate) console.log(`  Release Date: ${result.releaseDate}`);
    if (result.numberOfItems !== undefined) console.log(`  Tracks: ${result.numberOfItems}`);
    if (result.duration) console.log(`  Duration: ${result.duration}`);
    if (result.popularity !== undefined) console.log(`  Popularity: ${result.popularity}`);
    if (result.explicit !== undefined) console.log(`  Explicit: ${result.explicit}`);
    if (result.barcodeId) console.log(`  Barcode: ${result.barcodeId}`);
    if (result.coverUrl) console.log(`  Cover: ${result.coverUrl}`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function getAlbumByBarcodeData(barcode: string, client: any, countryCode: string): Promise<AlbumResult[]> {
  const { data, error } = await client.GET('/albums' as any, {
    params: {
      query: {
        countryCode,
        'filter[barcodeId]': [barcode] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get album by barcode — ${JSON.stringify(error)}`);
  }

  const items = (data as any).data ?? [];
  return items.map((item: any) => {
    const attrs = item.attributes as any;
    return {
      id: item.id,
      title: attrs?.title ?? 'Unknown',
      albumType: attrs?.albumType,
      releaseDate: attrs?.releaseDate,
      numberOfItems: attrs?.numberOfItems,
      duration: formatDuration(attrs?.duration),
      barcodeId: attrs?.barcodeId,
    };
  });
}

export async function getAlbumByBarcode(barcode: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const albums = await getAlbumByBarcodeData(barcode, client, countryCode);

    if (json) {
      console.log(JSON.stringify(albums, null, 2));
      return;
    }

    if (albums.length === 0) {
      console.log(`No albums found for barcode ${barcode}.`);
      return;
    }

    console.log(`\nAlbums matching barcode ${barcode}:\n`);
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
