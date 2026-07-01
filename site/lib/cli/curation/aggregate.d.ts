export interface AnalyzeLibraryOptions {
    /** Inspect playlist contents for duplicates + forgotten gems. Default true. */
    deep?: boolean;
    /** Max owned playlists to read in the deep pass. Default 100. */
    maxPlaylists?: number;
    /** Cap on listed duplicates / gems / playlist sizes in the output. Default 25. */
    sampleLimit?: number;
    /** Reference timestamp for staleness (ms). Defaults to Date.now(); injected in tests. */
    now?: number;
    /** Retry delay for membership pagination (ms). Passed to fetchAllPages; set 0 in tests. */
    pageRetryDelayMs?: number;
}
export interface PlaylistSize {
    id: string;
    name: string;
    trackCount: number;
}
export interface StalePlaylist {
    id: string;
    name: string;
    daysSinceModified: number;
}
export interface DuplicateTrack {
    trackId: string;
    title: string;
    inPlaylists: string[];
}
export interface GemTrack {
    trackId: string;
    title: string;
}
export interface LibraryAnalysis {
    totals: {
        ownedPlaylists: number;
        favoritedPlaylists: number;
        savedForLaterItems: number;
        savedByType: Record<string, number>;
    };
    playlists: {
        totalTracks: number;
        averageSize: number;
        emptyCount: number;
        largest: PlaylistSize | null;
        smallest: PlaylistSize | null;
        sizes: PlaylistSize[];
        stalest: StalePlaylist[];
        recentlyModified: StalePlaylist[];
    };
    savedArtists: string[];
    duplicates: {
        count: number;
        items: DuplicateTrack[];
    };
    forgottenGems: {
        count: number;
        items: GemTrack[];
    };
    recentActivity: {
        recentlyAddedTracks: number;
    };
    coverage: {
        analyzedPlaylists: number;
        totalPlaylists: number;
        truncatedPlaylists: boolean;
        partialMembership: boolean;
    };
    notes: string[];
}
export declare function analyzeLibraryData(client: any, countryCode: string, opts?: AnalyzeLibraryOptions): Promise<LibraryAnalysis>;
/**
 * Clean, human-readable summary for the `content` channel. No raw IDs, no ISO timestamps
 * (staleness is expressed in months/"a while"). Every MCP client reads this.
 */
export declare function buildLibrarySummary(a: LibraryAnalysis): string;
