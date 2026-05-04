"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSearchHistoryData = listSearchHistoryData;
exports.listSearchHistory = listSearchHistory;
exports.deleteSearchHistoryEntryData = deleteSearchHistoryEntryData;
exports.deleteSearchHistoryEntry = deleteSearchHistoryEntry;
exports.clearSearchHistoryData = clearSearchHistoryData;
exports.clearSearchHistory = clearSearchHistory;
const auth_1 = require("./auth");
async function listSearchHistoryData(client, countryCode) {
    const { data, error } = await client.GET('/searchHistoryEntries', {
        params: {
            query: { countryCode },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to list search history — ${JSON.stringify(error)}`);
    }
    const items = data.data ?? [];
    return items.map((item) => ({
        id: item.id,
        query: item.attributes?.query ?? '',
    }));
}
async function listSearchHistory(json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
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
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function deleteSearchHistoryEntryData(entryId, client) {
    const { error } = await client.DELETE('/searchHistoryEntries/{id}', {
        params: { path: { id: entryId } },
    });
    if (error) {
        throw new Error(`Failed to delete search history entry — ${JSON.stringify(error)}`);
    }
    return { id: entryId, deleted: true };
}
async function deleteSearchHistoryEntry(entryId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await deleteSearchHistoryEntryData(entryId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nSearch history entry ${entryId} deleted.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function clearSearchHistoryData(client, countryCode) {
    const entries = await listSearchHistoryData(client, countryCode);
    await Promise.all(entries.map((e) => deleteSearchHistoryEntryData(e.id, client)));
    return { deleted: entries.length };
}
async function clearSearchHistory(json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const result = await clearSearchHistoryData(client, countryCode);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nCleared ${result.deleted} search history entries.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=search-history.js.map