"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMixItemsData = getMixItemsData;
exports.getMixItems = getMixItems;
const auth_1 = require("./auth");
const categoryEndpoints = {
    daily: '/userDailyMixes/{id}/relationships/items',
    discovery: '/userDiscoveryMixes/{id}/relationships/items',
    'new-release': '/userNewReleaseMixes/{id}/relationships/items',
    offline: '/userOfflineMixes/{id}/relationships/items',
};
async function getMixItemsData(category, mixId, client, countryCode) {
    const { data, error } = await client.GET(categoryEndpoints[category], {
        params: {
            path: { id: mixId },
            query: {
                countryCode,
                include: ['items'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get mix items — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included.map((item) => {
        const attrs = item.attributes ?? {};
        return {
            id: item.id,
            type: item.type,
            name: attrs.title ?? attrs.name ?? 'Untitled',
        };
    });
}
async function getMixItems(category, mixId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=mix.js.map