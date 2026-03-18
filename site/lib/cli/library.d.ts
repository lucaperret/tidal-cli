import type { LibraryResourceType } from './types';
export type { LibraryResourceType };
export declare function addToLibraryData(resourceType: LibraryResourceType, resourceId: string, client: any): Promise<{
    resourceType: string;
    resourceId: string;
    added: boolean;
}>;
export declare function addToLibrary(resourceType: LibraryResourceType, resourceId: string, json: boolean): Promise<void>;
export declare function removeFromLibraryData(resourceType: LibraryResourceType, resourceId: string, client: any): Promise<{
    resourceType: string;
    resourceId: string;
    removed: boolean;
}>;
export declare function removeFromLibrary(resourceType: LibraryResourceType, resourceId: string, json: boolean): Promise<void>;
export declare function listFavoritedPlaylistsData(client: any): Promise<Array<{
    id: string;
    name: string;
    numberOfItems?: number;
}>>;
export declare function listFavoritedPlaylists(json: boolean): Promise<void>;
export declare function addPlaylistToFavoritesData(playlistId: string, client: any): Promise<{
    playlistId: string;
    added: boolean;
}>;
export declare function addPlaylistToFavorites(playlistId: string, json: boolean): Promise<void>;
export declare function removePlaylistFromFavoritesData(playlistId: string, client: any): Promise<{
    playlistId: string;
    removed: boolean;
}>;
export declare function removePlaylistFromFavorites(playlistId: string, json: boolean): Promise<void>;
