import type { PlaybackInfo, PlaybackUrl } from './types';
export type { PlaybackInfo, PlaybackUrl };
export declare function playbackInfoData(trackId: string, quality: string, client: any): Promise<PlaybackInfo>;
export declare function playbackInfo(trackId: string, quality: string, json: boolean): Promise<void>;
export declare function playbackUrlData(trackId: string, quality: string, client: any): Promise<PlaybackUrl>;
export declare function playbackUrl(trackId: string, quality: string, json: boolean): Promise<void>;
export declare function playbackPlay(trackId: string, quality: string): Promise<void>;
