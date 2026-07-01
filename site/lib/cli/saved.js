"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSavedItemsData = listSavedItemsData;
exports.listSavedItems = listSavedItems;
exports.addSavedItemData = addSavedItemData;
exports.addSavedItem = addSavedItem;
exports.removeSavedItemData = removeSavedItemData;
exports.removeSavedItem = removeSavedItem;
const auth_1 = require("./auth");
const pagination_1 = require("./pagination");
async function listSavedItemsData(client) {
    // Paginated: returns the full save-for-later collection, not just the first ~20.
    const { included } = await (0, pagination_1.fetchAllPages)(client, '/userCollectionSaveForLaters/{id}/relationships/items', {
        path: { id: 'me' },
        query: { include: ['items'] },
    });
    return included.map((item) => {
        const attrs = item.attributes ?? {};
        return {
            id: item.id,
            type: item.type,
            name: attrs.title ?? attrs.name ?? 'Untitled',
        };
    });
}
async function listSavedItems(json) {
    const client = await (0, auth_1.getApiClient)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function addSavedItemData(itemType, itemId, client) {
    const { error } = await client.POST('/userCollectionSaveForLaters/{id}/relationships/items', {
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
async function addSavedItem(itemType, itemId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await addSavedItemData(itemType, itemId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\n${itemType} ${itemId} saved for later.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function removeSavedItemData(itemType, itemId, client) {
    const { error } = await client.DELETE('/userCollectionSaveForLaters/{id}/relationships/items', {
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
async function removeSavedItem(itemType, itemId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await removeSavedItemData(itemType, itemId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\n${itemType} ${itemId} removed from saved.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=saved.js.map