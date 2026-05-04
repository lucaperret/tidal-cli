import { getApiClient, getCountryCode } from './auth';
import type { SearchHistoryEntry } from './types';
export type { SearchHistoryEntry };

export async function listSearchHistoryData(client: any, countryCode: string): Promise<SearchHistoryEntry[]> {
  const { data, error } = await (client as any).GET('/searchHistoryEntries', {
    params: {
      query: { countryCode } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to list search history — ${JSON.stringify(error)}`);
  }

  const items = (data as any).data ?? [];
  return items.map((item: any) => ({
    id: item.id,
    query: item.attributes?.query ?? '',
  }));
}

export async function listSearchHistory(json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const entries = await listSearchHistoryData(client, countryCode);

    if (json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) {
      console.log('No search history found.');
      return;
    }

    console.log('\nYour search history:\n');
    for (const entry of entries) {
      console.log(`  [${entry.id}] ${entry.query}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function deleteSearchHistoryEntryData(entryId: string, client: any): Promise<{ id: string; deleted: boolean }> {
  const { error } = await (client as any).DELETE('/searchHistoryEntries/{id}', {
    params: { path: { id: entryId } },
  });

  if (error) {
    throw new Error(`Failed to delete search history entry — ${JSON.stringify(error)}`);
  }

  return { id: entryId, deleted: true };
}

export async function deleteSearchHistoryEntry(entryId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await deleteSearchHistoryEntryData(entryId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nSearch history entry ${entryId} deleted.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function clearSearchHistoryData(client: any, countryCode: string): Promise<{ deleted: number }> {
  const entries = await listSearchHistoryData(client, countryCode);
  await Promise.all(entries.map((e) => deleteSearchHistoryEntryData(e.id, client)));
  return { deleted: entries.length };
}

export async function clearSearchHistory(json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const result = await clearSearchHistoryData(client, countryCode);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nCleared ${result.deleted} search history entries.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
