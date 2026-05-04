import type { SearchHistoryEntry } from './types';
export type { SearchHistoryEntry };
export declare function listSearchHistoryData(client: any, countryCode: string): Promise<SearchHistoryEntry[]>;
export declare function listSearchHistory(json: boolean): Promise<void>;
export declare function deleteSearchHistoryEntryData(entryId: string, client: any): Promise<{
    id: string;
    deleted: boolean;
}>;
export declare function deleteSearchHistoryEntry(entryId: string, json: boolean): Promise<void>;
export declare function clearSearchHistoryData(client: any, countryCode: string): Promise<{
    deleted: number;
}>;
export declare function clearSearchHistory(json: boolean): Promise<void>;
