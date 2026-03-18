"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentlyAddedData = getRecentlyAddedData;
exports.getRecentlyAdded = getRecentlyAdded;
const auth_1 = require("./auth");
const endpointMap = {
    tracks: '/userCollectionTracks/{id}/relationships/items',
    albums: '/userCollectionAlbums/{id}/relationships/items',
    artists: '/userCollectionArtists/{id}/relationships/items',
};
const includeTypeMap = {
    tracks: 'tracks',
    albums: 'albums',
    artists: 'artists',
};
async function getRecentlyAddedData(type, client, countryCode) {
    const { data, error } = await client.GET(endpointMap[type], {
        params: {
            path: { id: 'me' },
            query: {
                countryCode,
                include: ['items'],
                sort: ['-addedAt'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get recently added ${type} — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    const items = included
        .filter((item) => item.type === includeTypeMap[type])
        .map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            name: attrs?.title ?? attrs?.name ?? 'Unknown',
            addedAt: attrs?.addedAt,
        };
    });
    // Enrich with addedAt from the relationship data if available
    const relData = data.data ?? [];
    for (const rel of relData) {
        const addedAt = rel.meta?.addedAt;
        if (addedAt) {
            const match = items.find((i) => i.id === rel.id);
            if (match && !match.addedAt) {
                match.addedAt = addedAt;
            }
        }
    }
    return items;
}
async function getRecentlyAdded(type, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=history.js.map