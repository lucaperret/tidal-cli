"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendationsData = getRecommendationsData;
exports.getRecommendations = getRecommendations;
const auth_1 = require("./auth");
const categoryEndpoints = {
    daily: '/userDailyMixes/{id}',
    discovery: '/userDiscoveryMixes/{id}',
    'new-release': '/userNewReleaseMixes/{id}',
    offline: '/userOfflineMixes/{id}',
};
async function getCategoryItems(category, client, countryCode) {
    const { data, error } = await client.GET(categoryEndpoints[category], {
        params: {
            path: { id: 'me' },
            query: {
                countryCode,
                include: ['items'],
            },
        },
    });
    if (error || !data) {
        // Some categories (e.g. offline) may 404 for users without entitlement — treat as empty.
        return [];
    }
    const included = data.included ?? [];
    return included.map((item) => {
        const attrs = item.attributes ?? {};
        return {
            id: item.id,
            type: item.type,
            name: attrs.title ?? attrs.name ?? 'Untitled',
            category,
        };
    });
}
async function getRecommendationsData(client, countryCode, category) {
    if (category) {
        return getCategoryItems(category, client, countryCode);
    }
    const categories = ['daily', 'discovery', 'new-release', 'offline'];
    const results = await Promise.all(categories.map((c) => getCategoryItems(c, client, countryCode)));
    return results.flat();
}
async function getRecommendations(category, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
        }
        else {
            console.log('\nYour recommendations:\n');
            const grouped = items.reduce((acc, item) => {
                const key = item.category ?? 'other';
                (acc[key] ??= []).push(item);
                return acc;
            }, {});
            for (const cat of ['daily', 'discovery', 'new-release', 'offline']) {
                const list = grouped[cat];
                if (!list?.length)
                    continue;
                console.log(`  ${cat}:`);
                for (const item of list) {
                    console.log(`    [${item.id}] (${item.type}) ${item.name}`);
                }
            }
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=recommend.js.map