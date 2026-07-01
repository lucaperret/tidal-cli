"use strict";
// Resolve engine for the value-add layer.
//
// Given a host-model-proposed list of [{artist, title, isrc?}], resolve each to a real Tidal track:
// search → best-match → dedupe → preserve order → attach audio-quality flags → optional
// lossless-only / deep-cuts filtering → report what couldn't be found. Pure over the Tidal client.
//
// Why raw client.GET (not the shaped *Data fns): resolution needs `mediaTags` (the audio-quality
// signal) and `popularity`, which every *Data wrapper strips. So this module reads raw JSON:API.
// Writes (in register.ts) still reuse createPlaylistData. No server-side LLM, only the Tidal API.
//
// Cost note: each item costs ONE search call when quality comes from mediaTags. trackManifests
// verification (opts.verifyQuality) adds a second call per UNKNOWN track — off by default because
// the hosted server has a 60s budget and Tidal rate-limits ~1 request / 5s.
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualityFromMediaTags = qualityFromMediaTags;
exports.isLossless = isLossless;
exports.resolveTracks = resolveTracks;
exports.buildPreviewSummary = buildPreviewSummary;
const HIRES_TAGS = new Set(['HIRES_LOSSLESS', 'HI_RES_LOSSLESS', 'HIRES']);
const LOSSLESS_TAGS = new Set(['LOSSLESS']);
/** Map Tidal `mediaTags` to an audio-quality tier. UNKNOWN when no lossless marker is present. */
function qualityFromMediaTags(mediaTags) {
    if (!mediaTags || mediaTags.length === 0)
        return 'UNKNOWN';
    const up = mediaTags.map((t) => String(t).toUpperCase());
    if (up.some((t) => HIRES_TAGS.has(t)))
        return 'HI_RES_LOSSLESS';
    if (up.some((t) => LOSSLESS_TAGS.has(t)))
        return 'LOSSLESS';
    return 'UNKNOWN';
}
function isLossless(q) {
    return q === 'LOSSLESS' || q === 'HI_RES_LOSSLESS';
}
/** Strip diacritics + punctuation, lowercase, collapse whitespace. */
function normalize(s) {
    return String(s)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
/** Title core: drop "(feat. …)", "[remix]" and " - remastered" style qualifiers before normalizing. */
function coreTitle(s) {
    return normalize(String(s)
        .replace(/\((feat|ft|with)[^)]*\)/gi, ' ')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\s-\s.*$/g, ' '));
}
function tokenOverlap(a, b) {
    const ta = new Set(a.split(' ').filter(Boolean));
    const tb = new Set(b.split(' ').filter(Boolean));
    if (ta.size === 0 || tb.size === 0)
        return 0;
    let inter = 0;
    for (const t of ta)
        if (tb.has(t))
            inter++;
    return inter / Math.max(ta.size, tb.size);
}
// Substring credit only when the shorter side is long enough to be meaningful — avoids
// "Eve" ⊂ "Steve" or "A" ⊂ "ABBA" false positives.
function contains(a, b, minLen) {
    return (a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= minLen;
}
function titleScore(queryTitle, candidateTitle) {
    const q = normalize(queryTitle);
    const c = normalize(candidateTitle);
    if (!q || !c)
        return 0;
    if (q === c)
        return 1;
    if (coreTitle(queryTitle) === coreTitle(candidateTitle))
        return 0.9;
    if (contains(q, c, 4))
        return 0.7;
    return tokenOverlap(q, c) * 0.6;
}
function artistScore(queryArtist, candidateArtists) {
    const q = normalize(queryArtist);
    if (!q)
        return 0;
    let best = 0;
    for (const a of candidateArtists) {
        const c = normalize(a);
        if (!c)
            continue;
        if (q === c)
            best = Math.max(best, 1);
        else if (contains(q, c, 3))
            best = Math.max(best, 0.8);
        else
            best = Math.max(best, tokenOverlap(q, c) * 0.6);
    }
    return best;
}
function parseIsoDurationSeconds(iso) {
    if (!iso)
        return undefined;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m)
        return undefined;
    return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}
function mapIncludedTracks(data) {
    const included = data?.included ?? [];
    const artistName = new Map();
    for (const i of included) {
        if (i?.type === 'artists')
            artistName.set(String(i.id), i.attributes?.name ?? '');
    }
    return included
        .filter((i) => i?.type === 'tracks')
        .map((t) => {
        const a = t.attributes ?? {};
        const rels = t.relationships?.artists?.data ?? [];
        const artists = rels.map((r) => artistName.get(String(r.id))).filter((n) => !!n);
        return {
            id: String(t.id),
            title: a.title ?? '',
            artists,
            isrc: a.isrc,
            popularity: a.popularity,
            durationSeconds: parseIsoDurationSeconds(a.duration),
            mediaTags: Array.isArray(a.mediaTags) ? a.mediaTags : [],
        };
    });
}
function isTransientStatus(status) {
    return status === 429 || (typeof status === 'number' && status >= 500);
}
/** Raw track search returning quality-bearing candidates (one API call). */
async function searchTracksRaw(client, countryCode, query) {
    try {
        const res = await client.GET('/searchResults/{id}', {
            params: { path: { id: query }, query: { countryCode, include: ['tracks', 'artists'] } },
        });
        if (res.error || !res.data)
            return { tracks: [], transient: isTransientStatus(res.error?.status) };
        return { tracks: mapIncludedTracks(res.data), transient: false };
    }
    catch {
        return { tracks: [], transient: true };
    }
}
/** Exact ISRC lookup returning quality-bearing candidates (one API call). */
async function lookupByIsrcRaw(client, countryCode, isrc) {
    let data;
    try {
        const res = await client.GET('/tracks', {
            params: { query: { countryCode, 'filter[isrc]': [isrc], include: ['artists'] } },
        });
        if (res.error || !res.data)
            return { tracks: [], transient: isTransientStatus(res.error?.status) };
        data = res.data;
    }
    catch {
        return { tracks: [], transient: true };
    }
    // /tracks returns primary resources in `data` (not `included`); map both shapes.
    const artistName = new Map();
    for (const i of data.included ?? []) {
        if (i?.type === 'artists')
            artistName.set(String(i.id), i.attributes?.name ?? '');
    }
    const tracks = (data.data ?? []).map((t) => {
        const a = t.attributes ?? {};
        const rels = t.relationships?.artists?.data ?? [];
        const artists = rels.map((r) => artistName.get(String(r.id))).filter((n) => !!n);
        return {
            id: String(t.id),
            title: a.title ?? '',
            artists,
            isrc: a.isrc,
            popularity: a.popularity,
            durationSeconds: parseIsoDurationSeconds(a.duration),
            mediaTags: Array.isArray(a.mediaTags) ? a.mediaTags : [],
        };
    });
    return { tracks, transient: false };
}
async function verifyQualityViaManifest(client, trackId) {
    try {
        const res = await client.GET('/trackManifests/{id}', {
            params: {
                path: { id: trackId },
                query: {
                    adaptive: false,
                    formats: ['HEAACV1', 'AACLC', 'FLAC', 'FLAC_HIRES'],
                    manifestType: 'MPEG_DASH',
                    uriScheme: 'DATA',
                    usage: 'PLAYBACK',
                },
            },
        });
        const formats = res.data?.data?.attributes?.formats ?? [];
        if (formats.includes('FLAC_HIRES'))
            return 'HI_RES_LOSSLESS';
        if (formats.includes('FLAC'))
            return 'LOSSLESS';
        if (formats.includes('AACLC'))
            return 'HIGH';
        return 'UNKNOWN';
    }
    catch {
        return 'UNKNOWN';
    }
}
function pickBest(query, candidates, preferLossless) {
    const EPS = 1e-9;
    let best = null;
    let bestScore = -1; // RAW match score — the primary key (bonuses never inflate it)
    let bestTie = -1; // tiebreaker, applied ONLY between raw-equal candidates
    let bestHasArtist = false;
    for (const c of candidates) {
        // ISRC is authoritative when both sides have it.
        if (query.isrc && c.isrc && normalize(query.isrc) === normalize(c.isrc)) {
            return { track: c, match: 'exact' };
        }
        const ts = titleScore(query.title, c.title);
        const hasArtist = !!query.artist;
        const as = hasArtist ? artistScore(query.artist, c.artists) : 0;
        const score = hasArtist ? ts * 0.7 + as * 0.3 : ts;
        // Tiebreaker only: among candidates with an equal raw match score, prefer lossless (audiophile
        // mode), then more popular. This can NEVER let a weaker match win over a stronger one.
        const qualBonus = preferLossless && isLossless(qualityFromMediaTags(c.mediaTags)) ? 1 : 0;
        const tie = qualBonus * 10 + (c.popularity ?? 0);
        if (score > bestScore + EPS || (Math.abs(score - bestScore) <= EPS && tie > bestTie)) {
            bestScore = score;
            bestTie = tie;
            best = c;
            bestHasArtist = hasArtist && as >= 0.8;
        }
    }
    if (!best || bestScore < 0.5)
        return null;
    const match = bestScore >= 0.9 && (bestHasArtist || !query.artist) ? 'exact' : bestScore >= 0.7 ? 'strong' : 'weak';
    return { track: best, match };
}
async function resolveOne(client, countryCode, query, preferLossless) {
    if (!query.title || !query.title.trim())
        return { track: null, transient: false };
    let candidates = [];
    let transient = false;
    if (query.isrc) {
        const r = await lookupByIsrcRaw(client, countryCode, query.isrc);
        candidates = r.tracks;
        transient = r.transient;
    }
    if (candidates.length === 0) {
        const q = query.artist ? `${query.artist} ${query.title}` : query.title;
        const r = await searchTracksRaw(client, countryCode, q);
        candidates = r.tracks;
        transient = transient || r.transient;
    }
    const best = pickBest(query, candidates, preferLossless);
    if (!best)
        return { track: null, transient };
    return {
        track: {
            query,
            trackId: best.track.id,
            title: best.track.title,
            artists: best.track.artists,
            isrc: best.track.isrc,
            popularity: best.track.popularity,
            durationSeconds: best.track.durationSeconds,
            quality: qualityFromMediaTags(best.track.mediaTags),
            mediaTags: best.track.mediaTags,
            match: best.match,
        },
    };
}
async function resolveTracks(client, countryCode, queries, opts = {}) {
    const maxItems = opts.maxItems ?? 50;
    const concurrency = opts.concurrency ?? 1;
    const deadlineMs = opts.deadlineMs ?? 45000;
    const notes = [];
    const requested = queries.length;
    const truncated = requested > maxItems;
    if (truncated) {
        notes.push(`Resolved the first ${maxItems} of ${requested} requested tracks; the rest were skipped.`);
    }
    const slice = queries.slice(0, maxItems);
    const preferLossless = !!opts.losslessOnly;
    // Deadline-aware pool: stop launching new resolutions once the wall-clock budget is spent, so the
    // request can never hang past the host's timeout. Unstarted items become time-budget not-founds.
    const start = Date.now();
    const outcomes = new Array(slice.length); // undefined = not attempted
    let timedOut = false;
    let nextIdx = 0;
    const n = Math.max(1, Math.min(concurrency, slice.length || 1));
    const worker = async () => {
        while (true) {
            if (Date.now() - start >= deadlineMs) {
                timedOut = true;
                return;
            }
            const i = nextIdx++;
            if (i >= slice.length)
                return;
            outcomes[i] = await resolveOne(client, countryCode, slice[i], preferLossless);
        }
    };
    await Promise.all(Array.from({ length: n }, worker));
    // Preserve order; classify not-found by cause (genuine miss vs transient vs time budget).
    const ordered = [];
    const notFound = [];
    let skippedByDeadline = 0;
    slice.forEach((q, i) => {
        const o = outcomes[i];
        if (o === undefined) {
            skippedByDeadline++;
            notFound.push({ query: q, reason: 'not resolved (time budget reached)' });
        }
        else if (o.track) {
            ordered.push(o.track);
        }
        else {
            notFound.push({ query: q, reason: o.transient ? 'lookup failed (rate-limited or temporary) — retry' : 'no confident Tidal match' });
        }
    });
    if (timedOut && skippedByDeadline > 0) {
        notes.push(`Stopped after the ${Math.round(deadlineMs / 1000)}s time budget — ${skippedByDeadline} track${skippedByDeadline === 1 ? '' : 's'} not resolved. Retry with fewer items.`);
    }
    // Dedupe by trackId, keep first occurrence (order preserved).
    const seen = new Set();
    const deduped = [];
    let duplicatesRemoved = 0;
    for (const t of ordered) {
        if (seen.has(t.trackId)) {
            duplicatesRemoved++;
            continue;
        }
        seen.add(t.trackId);
        deduped.push(t);
    }
    // Optional manifest verification for UNKNOWN quality (bounded — caller opts in).
    if (opts.verifyQuality) {
        for (const t of deduped) {
            if (t.quality === 'UNKNOWN') {
                t.quality = await verifyQualityViaManifest(client, t.trackId);
            }
        }
    }
    // Apply filters → move excluded tracks to filteredOut with a reason.
    const kept = [];
    const filteredOut = [];
    for (const t of deduped) {
        if (opts.losslessOnly && !isLossless(t.quality)) {
            filteredOut.push({ ...t, filterReason: t.quality === 'UNKNOWN' ? 'quality unconfirmed (not verified lossless)' : 'not lossless' });
            continue;
        }
        if (opts.excludeHitsAbovePopularity !== undefined && (t.popularity ?? 0) >= opts.excludeHitsAbovePopularity) {
            filteredOut.push({ ...t, filterReason: 'too popular for deep cuts' });
            continue;
        }
        kept.push(t);
    }
    if (opts.losslessOnly) {
        const unconfirmed = filteredOut.filter((t) => t.filterReason.includes('unconfirmed')).length;
        if (kept.length === 0 && unconfirmed > 0 && unconfirmed === filteredOut.length) {
            // The headline failure mode: the search response carried no quality tags at all.
            notes.push('No tracks could be confirmed as lossless — the Tidal search response carried no audio-quality tags for these results. Re-run with verification enabled to check each track via playback manifests.');
        }
        else if (unconfirmed > 0) {
            notes.push(`${unconfirmed} track${unconfirmed === 1 ? '' : 's'} excluded because lossless status could not be confirmed from metadata — re-run with verification enabled to check via playback manifests.`);
        }
    }
    return {
        tracks: kept,
        notFound,
        filteredOut,
        stats: { requested, resolved: kept.length, duplicatesRemoved, truncated, timedOut },
        notes,
    };
}
function plural(n) {
    return n === 1 ? '' : 's';
}
/**
 * Clean preview text (the `content` channel). Track titles/artists only — never raw track IDs
 * (those live in structuredContent for the Save step).
 */
function buildPreviewSummary(r, opts = {}) {
    const lines = [];
    const label = opts.name ? `"${opts.name}"` : 'Playlist';
    const modeNote = opts.mode === 'audiophile' ? ' (lossless-only)'
        : opts.mode === 'deep_cuts' ? ' (deep cuts)'
            : opts.mode === 'energy_arc' ? ' (energy arc)'
                : '';
    lines.push(`${label} preview${modeNote}: ${r.tracks.length} track${plural(r.tracks.length)} ready.`);
    for (const t of r.tracks.slice(0, 10)) {
        lines.push(`  • ${t.title}${t.artists.length ? ` — ${t.artists[0]}` : ''}`);
    }
    if (r.tracks.length > 10)
        lines.push(`  …and ${r.tracks.length - 10} more.`);
    if (r.filteredOut.length) {
        const reasons = [...new Set(r.filteredOut.map((t) => t.filterReason))].join('; ');
        lines.push(`${r.filteredOut.length} track${plural(r.filteredOut.length)} excluded (${reasons}).`);
    }
    if (r.notFound.length) {
        const names = r.notFound
            .slice(0, 5)
            .map((n) => `${n.query.title}${n.query.artist ? ` — ${n.query.artist}` : ''}`)
            .join(', ');
        lines.push(`${r.notFound.length} not found: ${names}${r.notFound.length > 5 ? '…' : ''}.`);
    }
    if (r.stats.duplicatesRemoved) {
        lines.push(`${r.stats.duplicatesRemoved} duplicate${plural(r.stats.duplicatesRemoved)} removed.`);
    }
    for (const n of r.notes)
        lines.push(n);
    lines.push('Nothing has been saved yet — confirm to create this playlist in your Tidal library.');
    return lines.join('\n');
}
//# sourceMappingURL=resolve.js.map