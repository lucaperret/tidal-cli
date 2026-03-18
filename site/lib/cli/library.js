"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToLibraryData = addToLibraryData;
exports.addToLibrary = addToLibrary;
exports.removeFromLibraryData = removeFromLibraryData;
exports.removeFromLibrary = removeFromLibrary;
exports.listFavoritedPlaylistsData = listFavoritedPlaylistsData;
exports.listFavoritedPlaylists = listFavoritedPlaylists;
exports.addPlaylistToFavoritesData = addPlaylistToFavoritesData;
exports.addPlaylistToFavorites = addPlaylistToFavorites;
exports.removePlaylistFromFavoritesData = removePlaylistFromFavoritesData;
exports.removePlaylistFromFavorites = removePlaylistFromFavorites;
const auth_1 = require("./auth");
const collectionEndpoints = {
    artist: { path: '/userCollectionArtists/{id}/relationships/items', type: 'artists' },
    album: { path: '/userCollectionAlbums/{id}/relationships/items', type: 'albums' },
    track: { path: '/userCollectionTracks/{id}/relationships/items', type: 'tracks' },
    video: { path: '/userCollectionVideos/{id}/relationships/items', type: 'videos' },
};
async function addToLibraryData(resourceType, resourceId, client) {
    const endpoint = collectionEndpoints[resourceType];
    const { error } = await client.POST(endpoint.path, {
        params: { path: { id: 'me' } },
        body: {
            data: [{ id: resourceId, type: endpoint.type }],
        },
    });
    if (error) {
        throw new Error(`Failed to add ${resourceType} to library — ${JSON.stringify(error)}`);
    }
    return { resourceType, resourceId, added: true };
}
async function addToLibrary(resourceType, resourceId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await addToLibraryData(resourceType, resourceId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\n${capitalize(resourceType)} ${resourceId} added to your library.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function removeFromLibraryData(resourceType, resourceId, client) {
    const endpoint = collectionEndpoints[resourceType];
    const { error } = await client.DELETE(endpoint.path, {
        params: { path: { id: 'me' } },
        body: {
            data: [{ id: resourceId, type: endpoint.type }],
        },
    });
    if (error) {
        throw new Error(`Failed to remove ${resourceType} from library — ${JSON.stringify(error)}`);
    }
    return { resourceType, resourceId, removed: true };
}
async function removeFromLibrary(resourceType, resourceId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await removeFromLibraryData(resourceType, resourceId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\n${capitalize(resourceType)} ${resourceId} removed from your library.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function listFavoritedPlaylistsData(client) {
    const { data, error } = await client.GET('/userCollectionPlaylists/{id}/relationships/items', {
        params: {
            path: { id: 'me' },
            query: {
                include: ['items'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to list favorited playlists — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included
        .filter((item) => item.type === 'playlists')
        .map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            name: attrs?.name ?? 'Unknown',
            numberOfItems: attrs?.numberOfItems,
        };
    });
}
async function listFavoritedPlaylists(json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const playlists = await listFavoritedPlaylistsData(client);
        if (json) {
            console.log(JSON.stringify(playlists, null, 2));
            return;
        }
        if (playlists.length === 0) {
            console.log('No favorited playlists found.');
            return;
        }
        console.log('\nFavorited playlists:\n');
        for (const p of playlists) {
            console.log(`  [${p.id}] ${p.name} (${p.numberOfItems ?? 0} items)`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function addPlaylistToFavoritesData(playlistId, client) {
    const { error } = await client.POST('/userCollectionPlaylists/{id}/relationships/items', {
        params: { path: { id: 'me' } },
        body: {
            data: [{ id: playlistId, type: 'playlists' }],
        },
    });
    if (error) {
        throw new Error(`Failed to add playlist to favorites — ${JSON.stringify(error)}`);
    }
    return { playlistId, added: true };
}
async function addPlaylistToFavorites(playlistId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await addPlaylistToFavoritesData(playlistId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist ${playlistId} added to favorites.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function removePlaylistFromFavoritesData(playlistId, client) {
    const { error } = await client.DELETE('/userCollectionPlaylists/{id}/relationships/items', {
        params: { path: { id: 'me' } },
        body: {
            data: [{ id: playlistId, type: 'playlists' }],
        },
    });
    if (error) {
        throw new Error(`Failed to remove playlist from favorites — ${JSON.stringify(error)}`);
    }
    return { playlistId, removed: true };
}
async function removePlaylistFromFavorites(playlistId, json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await removePlaylistFromFavoritesData(playlistId, client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nPlaylist ${playlistId} removed from favorites.`);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
//# sourceMappingURL=library.js.map