import type { AlbumInfo, AlbumResult } from './types';
export type { AlbumInfo, AlbumResult };
export declare function getAlbumInfoData(albumId: string, client: any, countryCode: string): Promise<AlbumInfo>;
export declare function getAlbumInfo(albumId: string, json: boolean): Promise<void>;
export declare function getAlbumByBarcodeData(barcode: string, client: any, countryCode: string): Promise<AlbumResult[]>;
export declare function getAlbumByBarcode(barcode: string, json: boolean): Promise<void>;
