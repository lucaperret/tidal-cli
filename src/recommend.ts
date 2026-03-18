import { getApiClient, getCountryCode } from './auth';
import type { RecommendationItem } from './types';
export type { RecommendationItem };

export async function getRecommendationsData(client: any, countryCode: string): Promise<RecommendationItem[]> {
  const { data, error } = await client.GET('/userRecommendations/me' as any, {
    params: {
      query: {
        countryCode,
        include: ['discoveryMixes', 'myMixes', 'newArrivalMixes'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get recommendations — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included.map((item: any) => {
    const attrs = item.attributes as any;
    return {
      id: item.id,
      type: item.type,
      name: attrs?.title ?? attrs?.name ?? 'Untitled',
    };
  });
}

export async function getRecommendations(json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const items = await getRecommendationsData(client, countryCode);

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log('No recommendations found.');
      return;
    }

    console.log('\nYour recommendations:\n');
    for (const item of items) {
      console.log(`  [${item.id}] (${item.type}) ${item.name}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
