import { getApiClient, getCountryCode } from './auth';
import type { RecentItem, RecentType } from './types';
export type { RecentItem, RecentType };

const endpointMap: Record<RecentType, string> = {
  tracks: '/userCollectionTracks/{id}/relationships/items',
  albums: '/userCollectionAlbums/{id}/relationships/items',
  artists: '/userCollectionArtists/{id}/relationships/items',
};

const includeTypeMap: Record<RecentType, string> = {
  tracks: 'tracks',
  albums: 'albums',
  artists: 'artists',
};

export async function getRecentlyAddedData(type: RecentType, client: any, countryCode: string): Promise<RecentItem[]> {
  const { data, error } = await (client as any).GET(endpointMap[type], {
    params: {
      path: { id: 'me' },
      query: {
        countryCode,
        include: ['items'] as any,
        sort: ['-addedAt'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get recently added ${type} — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  const items = included
    .filter((item: any) => item.type === includeTypeMap[type])
    .map((item: any) => {
      const attrs = item.attributes as any;
      return {
        id: item.id,
        name: attrs?.title ?? attrs?.name ?? 'Unknown',
        addedAt: attrs?.addedAt,
      };
    });

  // Enrich with addedAt from the relationship data if available
  const relData = (data as any).data ?? [];
  for (const rel of relData) {
    const addedAt = rel.meta?.addedAt;
    if (addedAt) {
      const match = items.find((i: any) => i.id === rel.id);
      if (match && !match.addedAt) {
        match.addedAt = addedAt;
      }
    }
  }

  return items;
}

export async function getRecentlyAdded(type: RecentType, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const items = await getRecentlyAddedData(type, client, countryCode);

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log(`No recently added ${type} found.`);
      return;
    }

    console.log(`\nRecently added ${type}:\n`);
    for (const item of items) {
      const date = item.addedAt ? ` (added: ${item.addedAt})` : '';
      console.log(`  [${item.id}] ${item.name}${date}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
