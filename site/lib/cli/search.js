"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchData = searchData;
exports.search = search;
exports.searchSuggestionsData = searchSuggestionsData;
exports.searchSuggestions = searchSuggestions;
const auth_1 = require("./auth");
function formatDuration(isoDuration) {
    if (!isoDuration)
        return '';
    // ISO 8601 duration: PT3M45S
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return isoDuration;
    const h = match[1] ? `${match[1]}:` : '';
    const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
    const s = (match[3] ?? '0').padStart(2, '0');
    return `${h}${m}:${s}`;
}
async function searchData(type, query, client, countryCode) {
    const includeMap = {
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
                include: [includeMap[type]],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Search failed — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    const results = [];
    for (const item of included) {
        if (item.type === 'artists' && type === 'artist') {
            const attrs = item.attributes;
            results.push({
                id: item.id,
                type: 'artist',
                name: attrs?.name ?? 'Unknown',
                extra: { popularity: attrs?.popularity },
            });
        }
        else if (item.type === 'albums' && type === 'album') {
            const attrs = item.attributes;
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
        }
        else if (item.type === 'tracks' && type === 'track') {
            const attrs = item.attributes;
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
        }
        else if (item.type === 'videos' && type === 'video') {
            const attrs = item.attributes;
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
        }
        else if (item.type === 'playlists' && type === 'playlist') {
            const attrs = item.attributes;
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
            const pa = a.extra?.popularity ?? 0;
            const pb = b.extra?.popularity ?? 0;
            return pb - pa;
        });
    }
    return results;
}
async function search(type, query, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function searchSuggestionsData(query, client, countryCode) {
    const { data, error } = await client.GET('/searchSuggestions/{id}', {
        params: {
            path: { id: query },
            query: {
                countryCode,
                include: ['directHits'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get search suggestions — ${JSON.stringify(error)}`);
    }
    const attrs = data.data?.attributes ?? {};
    const suggestions = (attrs.suggestions ?? []).map((s) => s.query ?? s);
    const included = data.included ?? [];
    const directHits = included.map((item) => {
        const itemAttrs = item.attributes;
        return {
            id: item.id,
            type: item.type,
            name: itemAttrs?.title ?? itemAttrs?.name ?? 'Unknown',
        };
    });
    return { suggestions, directHits };
}
async function searchSuggestions(query, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=search.js.map