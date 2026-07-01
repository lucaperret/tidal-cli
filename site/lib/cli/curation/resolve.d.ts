export type AudioQuality = 'HI_RES_LOSSLESS' | 'LOSSLESS' | 'HIGH' | 'UNKNOWN';
export interface TrackQuery {
    title: string;
    artist?: string;
    isrc?: string;
}
export interface ResolvedTrack {
    query: TrackQuery;
    trackId: string;
    title: string;
    artists: string[];
    isrc?: string;
    popularity?: number;
    durationSeconds?: number;
    quality: AudioQuality;
    mediaTags: string[];
    match: 'exact' | 'strong' | 'weak';
}
export interface UnresolvedQuery {
    query: TrackQuery;
    reason: string;
}
export interface FilteredTrack extends ResolvedTrack {
    filterReason: string;
}
export interface ResolveOptions {
    /** Keep only LOSSLESS / HI_RES_LOSSLESS (audiophile mode). */
    losslessOnly?: boolean;
    /** Drop tracks at/above this popularity (0–1) — deep-cuts mode. */
    excludeHitsAbovePopularity?: number;
    /** Cap on input items processed. Default 50. */
    maxItems?: number;
    /** Concurrent resolutions. Default 1 (serial — safest under Tidal rate limits). */
    concurrency?: number;
    /** Verify UNKNOWN-quality tracks via trackManifests (extra call each). Default false. */
    verifyQuality?: boolean;
    /** Wall-clock budget (ms). Resolution stops once exceeded; remaining items are reported, never
     *  left to hang. Default 45000 — safely under the hosted server's 60s limit. */
    deadlineMs?: number;
}
export interface ResolveResult {
    tracks: ResolvedTrack[];
    notFound: UnresolvedQuery[];
    filteredOut: FilteredTrack[];
    stats: {
        requested: number;
        resolved: number;
        duplicatesRemoved: number;
        truncated: boolean;
        timedOut: boolean;
    };
    notes: string[];
}
/** Map Tidal `mediaTags` to an audio-quality tier. UNKNOWN when no lossless marker is present. */
export declare function qualityFromMediaTags(mediaTags?: string[]): AudioQuality;
export declare function isLossless(q: AudioQuality): boolean;
export declare function resolveTracks(client: any, countryCode: string, queries: TrackQuery[], opts?: ResolveOptions): Promise<ResolveResult>;
/**
 * Clean preview text (the `content` channel). Track titles/artists only — never raw track IDs
 * (those live in structuredContent for the Save step).
 */
export declare function buildPreviewSummary(r: ResolveResult, opts?: {
    mode?: string;
    name?: string;
}): string;
