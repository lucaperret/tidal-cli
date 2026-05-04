import type { ShareLink } from './types';
export type { ShareLink };
export type ShareableType = 'tracks' | 'albums';
export declare function createShareData(resourceType: ShareableType, resourceId: string, client: any): Promise<ShareLink>;
export declare function createShare(resourceType: ShareableType, resourceId: string, json: boolean): Promise<void>;
