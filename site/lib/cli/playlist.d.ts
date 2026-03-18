import type { PlaylistInfo } from './types';
export type { PlaylistInfo };
export declare function listPlaylistsData(client: any, countryCode: string): Promise<PlaylistInfo[]>;
export declare function listPlaylists(json: boolean): Promise<void>;
export declare function createPlaylistData(name: string, description: string, client: any): Promise<{
    id: string;
    name: string;
    description: string;
}>;
export declare function createPlaylist(name: string, description: string, json: boolean): Promise<void>;
export declare function renamePlaylistData(playlistId: string, name: string, client: any): Promise<{
    id: string;
    name: string;
    success: boolean;
}>;
export declare function renamePlaylist(playlistId: string, name: string, json: boolean): Promise<void>;
export declare function deletePlaylistData(playlistId: string, client: any): Promise<{
    id: string;
    deleted: boolean;
}>;
export declare function deletePlaylist(playlistId: string, json: boolean): Promise<void>;
export declare function addTrackToPlaylistData(playlistId: string, trackId: string, client: any): Promise<{
    playlistId: string;
    trackId: string;
    added: boolean;
}>;
export declare function addTrackToPlaylist(playlistId: string, trackId: string, json: boolean): Promise<void>;
export declare function removeTrackFromPlaylistData(playlistId: string, trackId: string, client: any): Promise<{
    playlistId: string;
    trackId: string;
    removed: boolean;
}>;
export declare function removeTrackFromPlaylist(playlistId: string, trackId: string, json: boolean): Promise<void>;
export declare function addAlbumToPlaylistData(playlistId: string, albumId: string, client: any, countryCode: string): Promise<{
    playlistId: string;
    albumId: string;
    tracksAdded: number;
}>;
export declare function addAlbumToPlaylist(playlistId: string, albumId: string, json: boolean): Promise<void>;
export declare function moveTrackInPlaylistData(playlistId: string, trackId: string, positionBefore: string, client: any): Promise<{
    playlistId: string;
    trackId: string;
    positionBefore: string;
    moved: boolean;
}>;
export declare function moveTrackInPlaylist(playlistId: string, trackId: string, positionBefore: string, json: boolean): Promise<void>;
export declare function updatePlaylistDescriptionData(playlistId: string, description: string, client: any): Promise<{
    id: string;
    description: string;
    success: boolean;
}>;
export declare function updatePlaylistDescription(playlistId: string, description: string, json: boolean): Promise<void>;
