"use strict";
// Shared registration for the value-add ("curation") MCP tools.
//
// Registered ALONGSIDE the existing low-level tools, gated by TIDAL_MCP_PROFILE at the call site
// (stdio: mcpb/server/index.ts, HTTP: site/app/api/mcp/route.ts). The two surfaces acquire a Tidal
// client differently (local OAuth vs per-user bearer token), so each passes its own `getClient`
// callback — the tool definitions themselves live here, once.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCurationTools = registerCurationTools;
const zod_1 = require("zod");
const aggregate_1 = require("./aggregate");
const resolve_1 = require("./resolve");
const respond_1 = require("./respond");
const components_1 = require("./components");
const playlist_1 = require("../playlist");
const DEEP_CUTS_POPULARITY = 0.7;
// Minimal per-track input the host model supplies (it does the taste/extraction reasoning).
const trackItem = zod_1.z.object({
    title: zod_1.z.string().describe('Track title'),
    artist: zod_1.z.string().optional().describe('Artist name — strongly recommended for accurate matching'),
    isrc: zod_1.z.string().optional().describe('ISRC code for exact resolution, when known'),
});
/** Shape the resolve result into a clean structured payload (IDs live here, not in summary text). */
function previewPayload(result, extra) {
    return {
        kind: 'preview',
        tracks: result.tracks,
        filteredOut: result.filteredOut,
        notFound: result.notFound,
        stats: result.stats,
        notes: result.notes,
        // Convenience for the Save step / ChatGPT component: the IDs to pass to create_playlist.
        trackIds: result.tracks.map((t) => t.trackId),
        ...extra,
    };
}
/**
 * Batch-add tracks to a playlist (chunked) — one write per chunk to respect the time budget.
 * Returns how many were added and whether all chunks succeeded; does NOT throw on a chunk error,
 * so a partial failure leaves the caller able to report "added N of M" instead of a hard error
 * with a half-populated playlist and a misleading message.
 */
async function addTracksBatched(client, playlistId, trackIds) {
    let added = 0;
    for (let i = 0; i < trackIds.length; i += 20) {
        const chunk = trackIds.slice(i, i + 20);
        const { error } = await client.POST('/playlists/{id}/relationships/items', {
            params: { path: { id: playlistId } },
            body: { data: chunk.map((id) => ({ id, type: 'tracks' })) },
        });
        if (error)
            return { added, ok: false };
        added += chunk.length;
    }
    return { added, ok: true };
}
function registerCurationTools(server, getClient) {
    // ChatGPT UI component resources (ignored by Claude / non-Apps clients).
    (0, components_1.registerCurationResources)(server);
    // === analyze_library (read-only) ===
    server.tool('analyze_library', 'Analyze the listener\'s Tidal library and return structured aggregates — playlist sizes and ' +
        'staleness, saved-item composition, cross-playlist duplicate tracks, and saved tracks that are ' +
        'in no playlist ("forgotten gems"). Use the returned data to describe the listener\'s taste, ' +
        'spot blind spots and ruts, infer genres/eras from artist and track names, and suggest cleanups. ' +
        'Read-only: it never modifies the library.', {
        deep: zod_1.z
            .boolean()
            .optional()
            .describe('Inspect playlist contents to detect cross-playlist duplicates and forgotten gems. ' +
            'Costs one read per playlist. Default true; set false for a fast metadata-only overview.'),
    }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Analyze Library' }, async (args, extra) => {
        const { client, countryCode } = await getClient(extra);
        const analysis = await (0, aggregate_1.analyzeLibraryData)(client, countryCode, { deep: args?.deep });
        return (0, respond_1.appResponse)({
            summary: (0, aggregate_1.buildLibrarySummary)(analysis),
            data: analysis,
            component: components_1.LIBRARY_INSIGHTS_URI,
        });
    });
    // === curate_playlist (read-only PREVIEW) ===
    server.tool('curate_playlist', 'Resolve a set of tracks YOU (the host model) propose into a real, ordered Tidal playlist preview, ' +
        'enforcing a curation constraint server-side. Modes: "audiophile" keeps only LOSSLESS/HI-RES ' +
        'tracks (the differentiator a generic chat cannot do); "deep_cuts" drops popular hits; ' +
        '"energy_arc" preserves your ordering for a deliberate energy curve; "plain" applies no filter. ' +
        'Returns an ordered preview with duplicates removed and unmatched tracks reported. ' +
        'Read-only — it does NOT save. Call create_playlist to commit a confirmed preview.', {
        items: zod_1.z.array(trackItem).describe('Candidate tracks you propose, in the order you want them.'),
        mode: zod_1.z
            .enum(['plain', 'audiophile', 'energy_arc', 'deep_cuts'])
            .optional()
            .describe('Curation constraint to enforce server-side. Default "plain".'),
        name: zod_1.z.string().optional().describe('Suggested playlist name for the preview.'),
        verify: zod_1.z
            .boolean()
            .optional()
            .describe('Audiophile mode only: when track metadata lacks quality tags, verify each track\'s lossless ' +
            'status via playback manifests (slower — one extra lookup per unconfirmed track). ' +
            'Use this if an audiophile preview returns 0 tracks for lack of quality metadata.'),
    }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Curate Playlist (preview)' }, async (args, extra) => {
        const { client, countryCode } = await getClient(extra);
        const mode = args.mode ?? 'plain';
        const result = await (0, resolve_1.resolveTracks)(client, countryCode, args.items ?? [], {
            losslessOnly: mode === 'audiophile',
            excludeHitsAbovePopularity: mode === 'deep_cuts' ? DEEP_CUTS_POPULARITY : undefined,
            verifyQuality: mode === 'audiophile' && !!args.verify,
        });
        return (0, respond_1.appResponse)({
            summary: (0, resolve_1.buildPreviewSummary)(result, { mode, name: args.name }),
            data: previewPayload(result, { mode, suggestedName: args.name ?? null }),
            component: components_1.PLAYLIST_PREVIEW_URI,
        });
    });
    // === playlist_from_text (read-only PREVIEW) ===
    server.tool('playlist_from_text', 'Turn a list of tracks YOU extracted from arbitrary text (a festival lineup, an article, film ' +
        'credits, a friend\'s recommendations) into a real, ordered Tidal playlist preview. Resolves each ' +
        'entry with fuzzy matching and clearly reports anything that could not be found. Read-only — it ' +
        'does NOT save. Call create_playlist to commit a confirmed preview.', {
        items: zod_1.z.array(trackItem).describe('Tracks you extracted from the source text, in order.'),
        name: zod_1.z.string().optional().describe('Suggested playlist name for the preview.'),
        source: zod_1.z.string().optional().describe('Short note on where the list came from (for context only).'),
    }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Playlist From Text (preview)' }, async (args, extra) => {
        const { client, countryCode } = await getClient(extra);
        const result = await (0, resolve_1.resolveTracks)(client, countryCode, args.items ?? [], {});
        return (0, respond_1.appResponse)({
            summary: (0, resolve_1.buildPreviewSummary)(result, { name: args.name }),
            data: previewPayload(result, { suggestedName: args.name ?? null, source: args.source ?? null }),
            component: components_1.PLAYLIST_PREVIEW_URI,
        });
    });
    // === create_playlist (WRITE — the only mutating curation tool) ===
    server.tool('create_playlist', 'Commit a confirmed playlist preview: create a new (unlisted) Tidal playlist and add the given ' +
        'tracks in order. Call this only after the listener has confirmed a preview from curate_playlist ' +
        'or playlist_from_text. Pass the trackIds from that preview\'s structured output.', {
        name: zod_1.z.string().min(1).describe('Playlist name (non-empty)'),
        trackIds: zod_1.z.array(zod_1.z.string().min(1)).describe('Tidal track IDs to add, in order (from a confirmed preview).'),
        description: zod_1.z.string().optional().describe('Optional playlist description'),
    }, { readOnlyHint: false, destructiveHint: false, openWorldHint: true, title: 'Create Playlist' }, async (args, extra) => {
        const { client } = await getClient(extra);
        // Defensive sanitize: drop blank/whitespace IDs the model might pass through.
        const ids = (args.trackIds ?? []).map((s) => String(s).trim()).filter(Boolean);
        const created = await (0, playlist_1.createPlaylistData)(args.name, args.description ?? '', client);
        const { added, ok } = ids.length ? await addTracksBatched(client, created.id, ids) : { added: 0, ok: true };
        const url = `https://tidal.com/playlist/${created.id}`;
        const summary = ok
            ? `Created playlist "${created.name}" with ${added} track${added === 1 ? '' : 's'}. ` +
                'It\'s now in your Tidal library (the link is in the details).'
            : `Created playlist "${created.name}" and added ${added} of ${ids.length} tracks before an error stopped the rest. ` +
                'The playlist is in your library — you can retry adding the remaining tracks.';
        return (0, respond_1.appResponse)({
            summary,
            data: { kind: 'created', playlistId: created.id, name: created.name, trackCount: added, requested: ids.length, complete: ok, url },
        });
    });
}
//# sourceMappingURL=register.js.map