import type { RecommendationItem } from './types';
export type { RecommendationItem };
export declare function getRecommendationsData(client: any, countryCode: string): Promise<RecommendationItem[]>;
export declare function getRecommendations(json: boolean): Promise<void>;
