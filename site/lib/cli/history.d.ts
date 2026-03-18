import type { RecentItem, RecentType } from './types';
export type { RecentItem, RecentType };
export declare function getRecentlyAddedData(type: RecentType, client: any, countryCode: string): Promise<RecentItem[]>;
export declare function getRecentlyAdded(type: RecentType, json: boolean): Promise<void>;
