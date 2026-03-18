import type { UserProfile } from './types';
export type { UserProfile };
export declare function getUserProfileData(client: any): Promise<UserProfile>;
export declare function getUserProfile(json: boolean): Promise<void>;
