import type { SearchType, SearchResult, SearchSuggestionsResult } from './types';
export type { SearchType, SearchResult, SearchSuggestionsResult };
export declare function searchData(type: SearchType, query: string, client: any, countryCode: string): Promise<SearchResult[]>;
export declare function search(type: SearchType, query: string, json: boolean): Promise<void>;
export declare function searchSuggestionsData(query: string, client: any, countryCode: string): Promise<SearchSuggestionsResult>;
export declare function searchSuggestions(query: string, json: boolean): Promise<void>;
