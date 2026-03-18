import { getApiClient } from './auth';
import type { LibraryResourceType } from './types';
export type { LibraryResourceType };

const collectionEndpoints: Record<LibraryResourceType, { path: string; type: string }> = {
  artist: { path: '/userCollectionArtists/{id}/relationships/items', type: 'artists' },
  album: { path: '/userCollectionAlbums/{id}/relationships/items', type: 'albums' },
  track: { path: '/userCollectionTracks/{id}/relationships/items', type: 'tracks' },
  video: { path: '/userCollectionVideos/{id}/relationships/items', type: 'videos' },
};

export async function addToLibraryData(
  resourceType: LibraryResourceType,
  resourceId: string,
  client: any,
): Promise<{ resourceType: string; resourceId: string; added: boolean }> {
  const endpoint = collectionEndpoints[resourceType];

  const { error } = await (client as any).POST(endpoint.path, {
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

export async function addToLibrary(
  resourceType: LibraryResourceType,
  resourceId: string,
  json: boolean,
): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await addToLibraryData(resourceType, resourceId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n${capitalize(resourceType)} ${resourceId} added to your library.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function removeFromLibraryData(
  resourceType: LibraryResourceType,
  resourceId: string,
  client: any,
): Promise<{ resourceType: string; resourceId: string; removed: boolean }> {
  const endpoint = collectionEndpoints[resourceType];

  const { error } = await (client as any).DELETE(endpoint.path, {
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

export async function removeFromLibrary(
  resourceType: LibraryResourceType,
  resourceId: string,
  json: boolean,
): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await removeFromLibraryData(resourceType, resourceId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n${capitalize(resourceType)} ${resourceId} removed from your library.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function listFavoritedPlaylistsData(client: any): Promise<Array<{ id: string; name: string; numberOfItems?: number }>> {
  const { data, error } = await (client as any).GET('/userCollectionPlaylists/{id}/relationships/items', {
    params: {
      path: { id: 'me' },
      query: {
        include: ['items'] as any,
      } as any,
    },
  });

  if (error || !data) {
    throw new Error(`Failed to list favorited playlists — ${JSON.stringify(error)}`);
  }

  const included = (data as any).included ?? [];
  return included
    .filter((item: any) => item.type === 'playlists')
    .map((item: any) => {
      const attrs = item.attributes as any;
      return {
        id: item.id,
        name: attrs?.name ?? 'Unknown',
        numberOfItems: attrs?.numberOfItems,
      };
    });
}

export async function listFavoritedPlaylists(json: boolean): Promise<void> {
  const client = await getApiClient();

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
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function addPlaylistToFavoritesData(playlistId: string, client: any): Promise<{ playlistId: string; added: boolean }> {
  const { error } = await (client as any).POST('/userCollectionPlaylists/{id}/relationships/items', {
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

export async function addPlaylistToFavorites(playlistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await addPlaylistToFavoritesData(playlistId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nPlaylist ${playlistId} added to favorites.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function removePlaylistFromFavoritesData(playlistId: string, client: any): Promise<{ playlistId: string; removed: boolean }> {
  const { error } = await (client as any).DELETE('/userCollectionPlaylists/{id}/relationships/items', {
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

export async function removePlaylistFromFavorites(playlistId: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await removePlaylistFromFavoritesData(playlistId, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nPlaylist ${playlistId} removed from favorites.`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
