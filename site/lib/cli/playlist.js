"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlaylistsData = listPlaylistsData;
exports.listPlaylists = listPlaylists;
exports.createPlaylistData = createPlaylistData;
exports.createPlaylist = createPlaylist;
exports.renamePlaylistData = renamePlaylistData;
exports.renamePlaylist = renamePlaylist;
exports.deletePlaylistData = deletePlaylistData;
exports.deletePlaylist = deletePlaylist;
exports.addTrackToPlaylistData = addTrackToPlaylistData;
exports.addTrackToPlaylist = addTrackToPlaylist;
exports.removeTrackFromPlaylistData = removeTrackFromPlaylistData;
exports.removeTrackFromPlaylist = removeTrackFromPlaylist;
exports.addAlbumToPlaylistData = addAlbumToPlaylistData;
exports.addAlbumToPlaylist = addAlbumToPlaylist;
exports.moveTrackInPlaylistData = moveTrackInPlaylistData;
exports.moveTrackInPlaylist = moveTrackInPlaylist;
exports.updatePlaylistDescriptionData = updatePlaylistDescriptionData;
exports.updatePlaylistDescription = updatePlaylistDescription;
const auth_1 = require("./auth");
async function listPlaylistsData(client, countryCode) {
    const { data, error } = await client.GET('/playlists', {
        params: {
            query: {
                'filter[owners.id]': ['me'],
                countryCode,
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to list playlists — ${JSON.stringify(error)}`);
    }
    return (data.data ?? []).map((p) => ({
        id: p.id,
        name: p.attributes?.name ?? 'Untitled',
        description: p.attributes?.description,
        numberOfItems: p.attributes?.numberOfItems,
        createdAt: p.attributes?.createdAt,
        lastModifiedAt: p.attributes?.lastModifiedAt,
    }));
}
async function listPlaylists(json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const playlists = await listPlaylistsData(client, countryCode);
        if (json) {
            console.log(JSON.stringify(playlists, null, 2));
            return;
        }
        if (playlists.length === 0) {
            console.log('No playlists found.');
            return;
        }
        console.log('\nYour playlists:\n');
        for (const p of playlists) {
            console.log(`  [${p.id}] ${p.name} (${p.numberOfItems ?? 0} tracks)`);
            if (p.description)
                console.log(`    ${p.description}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function createPlaylistData(name, description, client) {
    const { data, error } = await client.POST('/playlists', {
        body: {
            data: {
                type: 'playlists',
                attributes: {
                    name,
                    description,
                    accessType: 'UNLISTED',
                },
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to create playlist — ${JSON.stringify(error)}`);
    }
    const created = data.data;
    return {
        id: created.id,
        name: created.attributes?.name ?? name,
        description: created.attributes?.description ?? description,
    };
}
async function createPlaylist(name, description, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await createPlaylistData(name, description, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist created: [${result.id}] ${result.name}`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function renamePlaylistData(playlistId, name, client) {
    const { error } = await client.PATCH('/playlists/{id}', {
        params: { path: { id: playlistId } },
        body: {
            data: {
                type: 'playlists',
                id: playlistId,
                attributes: { name },
            },
        },
    });
    if (error) {
        throw new Error(`Failed to rename playlist — ${JSON.stringify(error)}`);
    }
    return { id: playlistId, name, success: true };
}
async function renamePlaylist(playlistId, name, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await renamePlaylistData(playlistId, name, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist ${playlistId} renamed to "${name}".`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function deletePlaylistData(playlistId, client) {
    const { error } = await client.DELETE('/playlists/{id}', {
        params: { path: { id: playlistId } },
    });
    if (error) {
        throw new Error(`Failed to delete playlist — ${JSON.stringify(error)}`);
    }
    return { id: playlistId, deleted: true };
}
async function deletePlaylist(playlistId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await deletePlaylistData(playlistId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist ${playlistId} deleted.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function addTrackToPlaylistData(playlistId, trackId, client) {
    const { error } = await client.POST('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
        body: {
            data: [{ id: trackId, type: 'tracks' }],
        },
    });
    if (error) {
        throw new Error(`Failed to add track — ${JSON.stringify(error)}`);
    }
    return { playlistId, trackId, added: true };
}
async function addTrackToPlaylist(playlistId, trackId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await addTrackToPlaylistData(playlistId, trackId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nTrack ${trackId} added to playlist ${playlistId}.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function removeTrackFromPlaylistData(playlistId, trackId, client) {
    const { data: itemsData, error: itemsError } = await client.GET('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
    });
    if (itemsError || !itemsData) {
        throw new Error(`Failed to get playlist items — ${JSON.stringify(itemsError)}`);
    }
    const items = itemsData.data ?? [];
    const item = items.find((i) => i.id === trackId);
    if (!item) {
        throw new Error(`Track ${trackId} not found in playlist ${playlistId}.`);
    }
    const { error } = await client.DELETE('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
        body: {
            data: [{ id: trackId, type: 'tracks', meta: { itemId: item.meta.itemId } }],
        },
    });
    if (error) {
        throw new Error(`Failed to remove track — ${JSON.stringify(error)}`);
    }
    return { playlistId, trackId, removed: true };
}
async function removeTrackFromPlaylist(playlistId, trackId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await removeTrackFromPlaylistData(playlistId, trackId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nTrack ${trackId} removed from playlist ${playlistId}.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function addAlbumToPlaylistData(playlistId, albumId, client, countryCode) {
    const { data: albumData, error: albumError } = await client.GET('/albums/{id}', {
        params: {
            path: { id: albumId },
            query: { countryCode, include: ['items'] },
        },
    });
    if (albumError || !albumData) {
        throw new Error(`Failed to get album — ${JSON.stringify(albumError)}`);
    }
    const included = albumData.included ?? [];
    const trackIds = included
        .filter((item) => item.type === 'tracks')
        .map((item) => ({ id: item.id, type: 'tracks' }));
    if (trackIds.length === 0) {
        throw new Error('No tracks found in album.');
    }
    const { error } = await client.POST('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
        body: { data: trackIds },
    });
    if (error) {
        throw new Error(`Failed to add album tracks — ${JSON.stringify(error)}`);
    }
    return { playlistId, albumId, tracksAdded: trackIds.length };
}
async function addAlbumToPlaylist(playlistId, albumId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const result = await addAlbumToPlaylistData(playlistId, albumId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\n${result.tracksAdded} tracks from album ${albumId} added to playlist ${playlistId}.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function moveTrackInPlaylistData(playlistId, trackId, positionBefore, client) {
    const { data: itemsData, error: itemsError } = await client.GET('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
    });
    if (itemsError || !itemsData) {
        throw new Error(`Failed to get playlist items — ${JSON.stringify(itemsError)}`);
    }
    const items = itemsData.data ?? [];
    const item = items.find((i) => i.id === trackId);
    if (!item) {
        throw new Error(`Track ${trackId} not found in playlist ${playlistId}.`);
    }
    const itemId = item.meta?.itemId;
    if (!itemId) {
        throw new Error(`Could not find itemId for track ${trackId}.`);
    }
    const meta = {};
    if (positionBefore !== 'end') {
        meta.positionBefore = positionBefore;
    }
    const { error } = await client.PATCH('/playlists/{id}/relationships/items', {
        params: { path: { id: playlistId } },
        body: {
            data: [{ id: trackId, type: 'tracks', meta: { itemId } }],
            meta,
        },
    });
    if (error) {
        throw new Error(`Failed to move track — ${JSON.stringify(error)}`);
    }
    return { playlistId, trackId, positionBefore, moved: true };
}
async function moveTrackInPlaylist(playlistId, trackId, positionBefore, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await moveTrackInPlaylistData(playlistId, trackId, positionBefore, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        const posDesc = positionBefore === 'end' ? 'to end of playlist' : `before item ${positionBefore}`;
        console.log(`\nTrack ${trackId} moved ${posDesc} in playlist ${playlistId}.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function updatePlaylistDescriptionData(playlistId, description, client) {
    const { error } = await client.PATCH('/playlists/{id}', {
        params: { path: { id: playlistId } },
        body: {
            data: {
                type: 'playlists',
                id: playlistId,
                attributes: { description },
            },
        },
    });
    if (error) {
        throw new Error(`Failed to update playlist description — ${JSON.stringify(error)}`);
    }
    return { id: playlistId, description, success: true };
}
async function updatePlaylistDescription(playlistId, description, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await updatePlaylistDescriptionData(playlistId, description, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist ${playlistId} description updated.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=playlist.js.map