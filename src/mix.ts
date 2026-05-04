import { getApiClient, getCountryCode } from './auth';
import type { MixCategory, MixItem } from './types';
export type { MixItem };

const categoryEndpoints: Record<MixCategory, string> = {
  daily: '/userDailyMixes/{id}/relationships/items',
  discovery: '/userDiscoveryMixes/{id}/relationships/items',
  'new-release': '/userNewReleaseMixes/{id}/relationships/items',
  offline: '/userOfflineMixes/{id}/relationships/items',
};

export async function getMixItemsData(
  category: MixCategory,
  mixId: string,
  client: any,
  countryCode: string,
): Promise<MixItem[]> {
  const { data, error } = await (client as any).GET(categoryEndpoints[category], {
    params: {
      path: { id: mixId },
      query: {
        countryCode,
        include: ['items'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get mix items — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included.map((item: any) => {
    const attrs = item.attributes ?? {};
    return {
      id: item.id,
      type: item.type,
      name: attrs.title ?? attrs.name ?? 'Untitled',
    };
  });
}

export async function getMixItems(category: MixCategory, mixId: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const items = await getMixItemsData(category, mixId, client, countryCode);

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log('No items found in this mix.');
      return;
    }

    console.log(`\n${category} mix [${mixId}] items:\n`);
    for (const item of items) {
      console.log(`  [${item.id}] (${item.type}) ${item.name}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
