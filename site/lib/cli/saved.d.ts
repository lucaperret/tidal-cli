import type { SavedItem, SavedItemType } from './types';
export type { SavedItem, SavedItemType };
export declare function listSavedItemsData(client: any): Promise<SavedItem[]>;
export declare function listSavedItems(json: boolean): Promise<void>;
export declare function addSavedItemData(itemType: SavedItemType, itemId: string, client: any): Promise<{
    id: string;
    type: SavedItemType;
    added: boolean;
}>;
export declare function addSavedItem(itemType: SavedItemType, itemId: string, json: boolean): Promise<void>;
export declare function removeSavedItemData(itemType: SavedItemType, itemId: string, client: any): Promise<{
    id: string;
    type: SavedItemType;
    removed: boolean;
}>;
export declare function removeSavedItem(itemType: SavedItemType, itemId: string, json: boolean): Promise<void>;
