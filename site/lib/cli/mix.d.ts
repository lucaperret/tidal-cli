import type { MixCategory, MixItem } from './types';
export type { MixItem };
export declare function getMixItemsData(category: MixCategory, mixId: string, client: any, countryCode: string): Promise<MixItem[]>;
export declare function getMixItems(category: MixCategory, mixId: string, json: boolean): Promise<void>;
