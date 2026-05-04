import { getApiClient, getCountryCode } from './auth';
import type { MixCategory, RecommendationItem } from './types';
export type { MixCategory, RecommendationItem };

const categoryEndpoints: Record<MixCategory, string> = {
  daily: '/userDailyMixes/{id}',
  discovery: '/userDiscoveryMixes/{id}',
  'new-release': '/userNewReleaseMixes/{id}',
  offline: '/userOfflineMixes/{id}',
};

async function getCategoryItems(category: MixCategory, client: any, countryCode: string): Promise<RecommendationItem[]> {
  const { data, error } = await (client as any).GET(categoryEndpoints[category], {
    params: {
      path: { id: 'me' },
      query: {
        countryCode,
        include: ['items'] as any,
      } as any,
    },
  });

  if (error || !data) {
    // Some categories (e.g. offline) may 404 for users without entitlement — treat as empty.
    return [];
  }

  const included = (data as any).included ?? [];
  return included.map((item: any) => {
    const attrs = item.attributes ?? {};
    return {
      id: item.id,
      type: item.type,
      name: attrs.title ?? attrs.name ?? 'Untitled',
      category,
    };
  });
}

export async function getRecommendationsData(
  client: any,
  countryCode: string,
  category?: MixCategory,
): Promise<RecommendationItem[]> {
  if (category) {
    return getCategoryItems(category, client, countryCode);
  }

  const categories: MixCategory[] = ['daily', 'discovery', 'new-release', 'offline'];
  const results = await Promise.all(categories.map((c) => getCategoryItems(c, client, countryCode)));
  return results.flat();
}

export async function getRecommendations(category: MixCategory | undefined, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const items = await getRecommendationsData(client, countryCode, category);

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log('No recommendations found.');
      return;
    }

    if (category) {
      console.log(`\nYour ${category} mixes:\n`);
      for (const item of items) {
        console.log(`  [${item.id}] (${item.type}) ${item.name}`);
      }
    } else {
      console.log('\nYour recommendations:\n');
      const grouped = items.reduce<Record<string, RecommendationItem[]>>((acc, item) => {
        const key = item.category ?? 'other';
        (acc[key] ??= []).push(item);
        return acc;
      }, {});
      for (const cat of ['daily', 'discovery', 'new-release', 'offline'] as const) {
        const list = grouped[cat];
        if (!list?.length) continue;
        console.log(`  ${cat}:`);
        for (const item of list) {
          console.log(`    [${item.id}] (${item.type}) ${item.name}`);
        }
      }
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
