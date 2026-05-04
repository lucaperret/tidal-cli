import { getApiClient } from './auth';
import type { ShareLink } from './types';
export type { ShareLink };

export type ShareableType = 'tracks' | 'albums';

export async function createShareData(
  resourceType: ShareableType,
  resourceId: string,
  client: any,
): Promise<ShareLink> {
  const { data, error } = await (client as any).POST('/shares', {
    body: {
      data: {
        type: 'shares',
        relationships: {
          sharedResources: {
            data: [{ id: resourceId, type: resourceType }],
          },
        },
      },
    },
  });

  if (error || !data) {
    throw new Error(`Failed to create share — ${JSON.stringify(error)}`);
  }

  const created = (data as any).data ?? {};
  const attrs = created.attributes ?? {};
  const tidalLink = (attrs.externalLinks ?? []).find((l: any) => /tidal\.com/i.test(l?.href ?? ''));
  return {
    id: created.id,
    code: attrs.code ?? '',
    createdAt: attrs.createdAt,
    url: tidalLink?.href ?? attrs.externalLinks?.[0]?.href,
  };
}

export async function createShare(resourceType: ShareableType, resourceId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await createShareData(resourceType, resourceId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nShare created for ${resourceType} ${resourceId}:`);
    console.log(`  Code: ${result.code}`);
    if (result.url) console.log(`  URL: ${result.url}`);
    if (result.createdAt) console.log(`  Created: ${result.createdAt}`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
