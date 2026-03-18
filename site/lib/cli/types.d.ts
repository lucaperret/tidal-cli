export type SearchType = 'artist' | 'album' | 'track' | 'video' | 'playlist';
export interface SearchResult {
    id: string;
    type: string;
    name: string;
    extra?: Record<string, unknown>;
}
export interface SearchSuggestionsResult {
    suggestions: string[];
    directHits: Array<{
        id: string;
        type: string;
        name: string;
    }>;
}
export interface ArtistInfo {
    id: string;
    name: string;
    popularity?: number;
    handle?: string;
    biography?: string;
}
export interface ArtistTrack {
    id: string;
    title: string;
    duration: string;
    isrc?: string;
    popularity?: number;
}
export interface ArtistAlbum {
    id: string;
    title: string;
    albumType?: string;
    releaseDate?: string;
    numberOfItems?: number;
}
export interface SimilarArtist {
    id: string;
    name: string;
    popularity?: number;
}
export interface RadioPlaylist {
    id: string;
    type?: string;
    name: string;
    numberOfItems?: number;
}
export interface TrackInfo {
    id: string;
    title: string;
    artists: string[];
    album?: string;
    duration: string;
    isrc?: string;
    bpm?: number;
    key?: string;
    popularity?: number;
    explicit?: boolean;
    coverUrl?: string;
}
export interface SimilarTrack {
    id: string;
    title: string;
    duration: string;
    isrc?: string;
    popularity?: number;
}
export interface AlbumInfo {
    id: string;
    title: string;
    artists: string[];
    albumType?: string;
    releaseDate?: string;
    numberOfItems?: number;
    duration: string;
    popularity?: number;
    explicit?: boolean;
    barcodeId?: string;
    coverUrl?: string;
}
export interface AlbumResult {
    id: string;
    title: string;
    albumType?: string;
    releaseDate?: string;
    numberOfItems?: number;
    duration: string;
    barcodeId?: string;
}
export interface PlaylistInfo {
    id: string;
    name: string;
    description?: string;
    numberOfItems?: number;
    createdAt?: string;
    lastModifiedAt?: string;
}
export interface PlaybackInfo {
    trackId: string;
    presentation?: string;
    previewReason?: string;
    audioQuality?: string;
    formats?: string[];
    manifestMimeType?: string;
    trackReplayGain?: number;
    trackPeakAmplitude?: number;
    albumReplayGain?: number;
    albumPeakAmplitude?: number;
}
export interface PlaybackUrl {
    trackId: string;
    audioQuality?: string;
    url?: string;
    type?: 'direct' | 'dash';
    initUrl?: string;
    segmentCount?: number;
}
export interface UserProfile {
    id: string;
    username: string;
    country: string;
    email?: string;
}
export interface RecommendationItem {
    id: string;
    type: string;
    name: string;
}
export interface RecentItem {
    id: string;
    name: string;
    addedAt?: string;
}
export type LibraryResourceType = 'artist' | 'album' | 'track' | 'video';
export type RecentType = 'tracks' | 'albums' | 'artists';
