"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendationsData = getRecommendationsData;
exports.getRecommendations = getRecommendations;
const auth_1 = require("./auth");
async function getRecommendationsData(client, countryCode) {
    const { data, error } = await client.GET('/userRecommendations/me', {
        params: {
            query: {
                countryCode,
                include: ['discoveryMixes', 'myMixes', 'newArrivalMixes'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get recommendations — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included.map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            type: item.type,
            name: attrs?.title ?? attrs?.name ?? 'Untitled',
        };
    });
}
async function getRecommendations(json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=recommend.js.map