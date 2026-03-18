import type { TrackInfo, SimilarTrack, RadioPlaylist } from './types';
export type { TrackInfo, SimilarTrack };
export declare function getTrackInfoData(trackId: string, client: any, countryCode: string): Promise<TrackInfo>;
export declare function getTrackInfo(trackId: string, json: boolean): Promise<void>;
export declare function getTrackRadioData(trackId: string, client: any, countryCode: string): Promise<RadioPlaylist[]>;
export declare function getTrackRadio(trackId: string, json: boolean): Promise<void>;
interface TrackByIsrcResult {
    id: string;
    title: string;
    artists: string[];
    duration: string;
    isrc?: string;
    popularity?: number;
}
export declare function getTrackByIsrcData(isrc: string, client: any, countryCode: string): Promise<TrackByIsrcResult[]>;
export declare function getTrackByIsrc(isrc: string, json: boolean): Promise<void>;
export declare function getSimilarTracksData(trackId: string, client: any, countryCode: string): Promise<SimilarTrack[]>;
export declare function getSimilarTracks(trackId: string, json: boolean): Promise<void>;
