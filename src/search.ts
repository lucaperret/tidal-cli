import { getApiClient, getCountryCode } from './auth';
import type { SearchType, SearchResult, SearchSuggestionsResult } from './types';
export type { SearchType, SearchResult, SearchSuggestionsResult };

function formatDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return '';
  // ISO 8601 duration: PT3M45S
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const h = match[1] ? `${match[1]}:` : '';
  const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
  const s = (match[3] ?? '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

export async function searchData(type: SearchType, query: string, client: any, countryCode: string): Promise<SearchResult[]> {
  const includeMap: Record<SearchType, string> = {
    artist: 'artists',
    album: 'albums',
    track: 'tracks',
    video: 'videos',
    playlist: 'playlists',
  };

  const { data, error } = await client.GET('/searchResults/{id}', {
    params: {
      path: { id: query },
      query: {
        countryCode,
        include: [includeMap[type] as any],
      },
    },
  });

  if (error || !data) {
    throw new Error(`Search failed — ${JSON.stringify(error)}`);
  }

  const included = data.included ?? [];
  const results: SearchResult[] = [];

  for (const item of included) {
    if (item.type === 'artists' && type === 'artist') {
      const attrs = item.attributes as any;
      results.push({
        id: item.id,
        type: 'artist',
        name: attrs?.name ?? 'Unknown',
        extra: { popularity: attrs?.popularity },
      });
    } else if (item.type === 'albums' && type === 'album') {
      const attrs = item.attributes as any;
      results.push({
        id: item.id,
        type: 'album',
        name: attrs?.title ?? 'Unknown',
        extra: {
          albumType: attrs?.albumType,
          numberOfItems: attrs?.numberOfItems,
          releaseDate: attrs?.releaseDate,
          duration: formatDuration(attrs?.duration),
        },
      });
    } else if (item.type === 'tracks' && type === 'track') {
      const attrs = item.attributes as any;
      results.push({
        id: item.id,
        type: 'track',
        name: attrs?.title ?? 'Unknown',
        extra: {
          duration: formatDuration(attrs?.duration),
          explicit: attrs?.explicit,
          isrc: attrs?.isrc,
          popularity: attrs?.popularity,
        },
      });
    } else if (item.type === 'videos' && type === 'video') {
      const attrs = item.attributes as any;
      results.push({
        id: item.id,
        type: 'video',
        name: attrs?.title ?? 'Unknown',
        extra: {
          duration: formatDuration(attrs?.duration),
          explicit: attrs?.explicit,
          popularity: attrs?.popularity,
        },
      });
    } else if (item.type === 'playlists' && type === 'playlist') {
      const attrs = item.attributes as any;
      results.push({
        id: item.id,
        type: 'playlist',
        name: attrs?.name ?? 'Unknown',
        extra: {
          numberOfItems: attrs?.numberOfItems,
          description: attrs?.description,
        },
      });
    }
  }

  // Sort by popularity (most relevant first) — skip albums and playlists which lack a direct popularity field
  if (type !== 'album' && type !== 'playlist') {
    results.sort((a, b) => {
      const pa = (a.extra?.popularity as number) ?? 0;
      const pb = (b.extra?.popularity as number) ?? 0;
      return pb - pa;
    });
  }

  return results;
}

export async function search(type: SearchType, query: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const results = await searchData(type, query, client, countryCode);

    if (json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(`No ${type}s found for "${query}".`);
      return;
    }

    const typeLabel = type === 'playlist' ? 'playlists' : `${type}s`;
    console.log(`\nSearch results for "${query}" (${typeLabel}):\n`);
    for (const r of results) {
      const extras = r.extra
        ? Object.entries(r.extra)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '';
      console.log(`  [${r.id}] ${r.name}${extras ? ` (${extras})` : ''}`);
    }
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function searchSuggestionsData(query: string, client: any, countryCode: string): Promise<SearchSuggestionsResult> {
  const { data, error } = await client.GET('/searchSuggestions/{id}' as any, {
    params: {
      path: { id: query },
      query: {
        countryCode,
        include: ['directHits'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get search suggestions — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes ?? {};
  const suggestions = (attrs.suggestions ?? []).map((s: any) => s.query ?? s);
  const included = (data as any).included ?? [];

  const directHits = included.map((item: any) => {
    const itemAttrs = item.attributes as any;
    return {
      id: item.id,
      type: item.type,
      name: itemAttrs?.title ?? itemAttrs?.name ?? 'Unknown',
    };
  });

  return { suggestions, directHits };
}

export async function searchSuggestions(query: string, json: boolean): Promise<void> {
  const client = await getApiClient();
  const countryCode = await getCountryCode();

  try {
    const result = await searchSuggestionsData(query, client, countryCode);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.suggestions.length > 0) {
      console.log(`\nSuggestions for "${query}":\n`);
      for (const s of result.suggestions) {
        console.log(`  ${s}`);
      }
    }

    if (result.directHits.length > 0) {
      console.log(`\nDirect hits:\n`);
      for (const h of result.directHits) {
        console.log(`  [${h.id}] (${h.type}) ${h.name}`);
      }
    }

    if (result.suggestions.length === 0 && result.directHits.length === 0) {
      console.log(`No suggestions found for "${query}".`);
    }

    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
