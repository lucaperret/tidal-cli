"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShareData = createShareData;
exports.createShare = createShare;
const auth_1 = require("./auth");
async function createShareData(resourceType, resourceId, client) {
    const { data, error } = await client.POST('/shares', {
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
    const created = data.data ?? {};
    const attrs = created.attributes ?? {};
    const tidalLink = (attrs.externalLinks ?? []).find((l) => /tidal\.com/i.test(l?.href ?? ''));
    return {
        id: created.id,
        code: attrs.code ?? '',
        createdAt: attrs.createdAt,
        url: tidalLink?.href ?? attrs.externalLinks?.[0]?.href,
    };
}
async function createShare(resourceType, resourceId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await createShareData(resourceType, resourceId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nShare created for ${resourceType} ${resourceId}:`);
        console.log(`  Code: ${result.code}`);
        if (result.url)
            console.log(`  URL: ${result.url}`);
        if (result.createdAt)
            console.log(`  Created: ${result.createdAt}`);
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=share.js.map