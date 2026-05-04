import type { MixCategory, RecommendationItem } from './types';
export type { MixCategory, RecommendationItem };
export declare function getRecommendationsData(client: any, countryCode: string, category?: MixCategory): Promise<RecommendationItem[]>;
export declare function getRecommendations(category: MixCategory | undefined, json: boolean): Promise<void>;
