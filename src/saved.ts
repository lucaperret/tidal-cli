import { getApiClient } from './auth';
import type { SavedItem, SavedItemType } from './types';
export type { SavedItem, SavedItemType };

export async function listSavedItemsData(client: any): Promise<SavedItem[]> {
  const { data, error } = await (client as any).GET('/userCollectionSaveForLaters/{id}/relationships/items', {
    params: {
      path: { id: 'me' },
      query: { include: ['items'] as any } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to list saved items — ${JSON.stringify(error)}`);
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

export async function listSavedItems(json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const items = await listSavedItemsData(client);

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log('No saved items found.');
      return;
    }

    console.log('\nSaved for later:\n');
    for (const item of items) {
      console.log(`  [${item.id}] (${item.type}) ${item.name}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function addSavedItemData(
  itemType: SavedItemType,
  itemId: string,
  client: any,
): Promise<{ id: string; type: SavedItemType; added: boolean }> {
  const { error } = await (client as any).POST('/userCollectionSaveForLaters/{id}/relationships/items', {
    params: { path: { id: 'me' } },
    body: {
      data: [{ id: itemId, type: itemType }],
    },
  });

  if (error) {
    throw new Error(`Failed to save item — ${JSON.stringify(error)}`);
  }

  return { id: itemId, type: itemType, added: true };
}

export async function addSavedItem(itemType: SavedItemType, itemId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await addSavedItemData(itemType, itemId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n${itemType} ${itemId} saved for later.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function removeSavedItemData(
  itemType: SavedItemType,
  itemId: string,
  client: any,
): Promise<{ id: string; type: SavedItemType; removed: boolean }> {
  const { error } = await (client as any).DELETE('/userCollectionSaveForLaters/{id}/relationships/items', {
    params: { path: { id: 'me' } },
    body: {
      data: [{ id: itemId, type: itemType }],
    },
  });

  if (error) {
    throw new Error(`Failed to remove saved item — ${JSON.stringify(error)}`);
  }

  return { id: itemId, type: itemType, removed: true };
}

export async function removeSavedItem(itemType: SavedItemType, itemId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await removeSavedItemData(itemType, itemId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n${itemType} ${itemId} removed from saved.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
