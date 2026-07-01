// Library aggregation for the value-add layer.
//
// Pure-ish functions over the existing `*Data` layer (reused, never forked). They turn the
// user's Tidal library into clean aggregates that the HOST model (Claude / ChatGPT) interprets
// into a taste profile, blind spots and cleanup nudges. No server-side LLM, no external API.
//
// Cost model (Tidal rate-limits ~1 request / 5s):
//  - Cheap aggregates (sizes, staleness, saved composition, recency) cost 4 fixed reads.
//  - The deep pass (cross-playlist duplicates + "saved but in no playlist" gems) reads each
//    non-empty owned playlist's full membership via the shared `fetchAllPages` helper. It is
//    bounded by `maxPlaylists` and reports `coverage.truncatedPlaylists` / `coverage.partialMembership`
//    (the latter set when a playlist read errors) so nothing is silently dropped.

import { listPlaylistsData } from '../playlist';
import { listFavoritedPlaylistsData } from '../library';
import { listSavedItemsData } from '../saved';
import { getRecentlyAddedData } from '../history';
import { fetchAllPages } from '../pagination';
import type { PlaylistInfo } from '../types';

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

// IDs live in these structured fields (a UI component / clean-up action needs them); the
// human-readable summary built from this data never includes raw IDs.
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
  duplicates: { count: number; items: DuplicateTrack[] };
  forgottenGems: { count: number; items: GemTrack[] };
  recentActivity: { recentlyAddedTracks: number };
  coverage: {
    analyzedPlaylists: number;
    totalPlaylists: number;
    truncatedPlaylists: boolean;
    partialMembership: boolean;
  };
  notes: string[];
}

const DAY_MS = 86_400_000;

function daysSince(now: number, iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

/** Run a reader, returning a fallback (and recording a note) instead of throwing. */
async function safe<T>(fn: () => Promise<T>, fallback: T, notes: string[], label: string): Promise<T> {
  try {
    return await fn();
  } catch {
    notes.push(`Could not read ${label} — that section may be incomplete.`);
    return fallback;
  }
}

interface PlaylistItems {
  ids: string[];
  titles: Map<string, string>;
}

/**
 * Read one playlist's full membership (item IDs + titles via `include`) using the shared
 * cursor-pagination helper. Throws on a hard read failure (caller catches → flags partial).
 */
async function fetchPlaylistItems(client: any, playlistId: string, retryDelayMs?: number): Promise<PlaylistItems> {
  const { data: refs, included } = await fetchAllPages(
    client,
    '/playlists/{id}/relationships/items',
    { path: { id: playlistId }, query: { include: ['items'] } },
    retryDelayMs !== undefined ? { retryDelayMs } : {},
  );
  const ids = (refs ?? []).filter((r: any) => r?.id).map((r: any) => String(r.id));
  const titles = new Map<string, string>();
  for (const inc of included ?? []) {
    if (inc?.type === 'tracks') titles.set(String(inc.id), inc.attributes?.title ?? '');
  }
  return { ids, titles };
}

export async function analyzeLibraryData(
  client: any,
  countryCode: string,
  opts: AnalyzeLibraryOptions = {},
): Promise<LibraryAnalysis> {
  const deep = opts.deep ?? true;
  const maxPlaylists = opts.maxPlaylists ?? 100;
  const sampleLimit = opts.sampleLimit ?? 25;
  const now = opts.now ?? Date.now();
  const notes: string[] = [];

  // --- Cheap reads (4 fixed requests). Degrade gracefully if any fails. ---
  const [playlists, favorited, saved, recent] = await Promise.all([
    safe(() => listPlaylistsData(client, countryCode), [] as PlaylistInfo[], notes, 'playlists'),
    safe(() => listFavoritedPlaylistsData(client), [] as Array<{ id: string; name: string }>, notes, 'followed playlists'),
    safe(() => listSavedItemsData(client), [] as Array<{ id: string; type: string; name: string }>, notes, 'saved-for-later items'),
    safe(() => getRecentlyAddedData('tracks', client, countryCode), [] as Array<{ id: string; name: string }>, notes, 'recently added tracks'),
  ]);

  // --- Playlist size + staleness aggregates (no extra requests). ---
  const sizesAll: PlaylistSize[] = playlists.map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.numberOfItems ?? 0,
  }));
  const totalTracks = sizesAll.reduce((s, p) => s + p.trackCount, 0);
  const averageSize = sizesAll.length ? Math.round(totalTracks / sizesAll.length) : 0;
  const emptyCount = sizesAll.filter((p) => p.trackCount === 0).length;
  const sizesSorted = [...sizesAll].sort((a, b) => b.trackCount - a.trackCount);
  const largest = sizesSorted[0] ?? null;
  const smallest = sizesSorted.length ? sizesSorted[sizesSorted.length - 1] : null;

  const withAge = playlists
    .map((p) => ({ id: p.id, name: p.name, days: daysSince(now, p.lastModifiedAt ?? p.createdAt) }))
    .filter((p): p is { id: string; name: string; days: number } => p.days !== null);
  const stalest = [...withAge]
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, daysSinceModified: p.days }));
  const recentlyModified = [...withAge]
    .sort((a, b) => a.days - b.days)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, daysSinceModified: p.days }));

  // --- Saved-for-later composition. ---
  const savedByType: Record<string, number> = {};
  for (const item of saved) {
    savedByType[item.type] = (savedByType[item.type] ?? 0) + 1;
  }
  const savedArtists = saved
    .filter((i) => i.type === 'artists')
    .map((i) => i.name)
    .filter((n) => n && n !== 'Untitled');
  const savedTracks = saved.filter((i) => i.type === 'tracks');

  // --- Deep pass: cross-playlist duplicates + forgotten gems. ---
  let duplicates: DuplicateTrack[] = [];
  let duplicateCount = 0;
  let gems: GemTrack[] = [];
  let gemCount = 0;
  let analyzedPlaylists = 0;
  let partialMembership = false;
  const truncatedPlaylists = deep && playlists.length > maxPlaylists;

  if (deep && playlists.length > 0) {
    const toAnalyze = playlists.slice(0, maxPlaylists);
    analyzedPlaylists = toAnalyze.length;

    // Key by playlist ID, not name: two distinct playlists can share a name, and a track in both
    // is still a cross-playlist duplicate. Resolve IDs back to names only for display.
    const trackToPlaylistIds = new Map<string, Set<string>>();
    const playlistNameById = new Map<string, string>();
    const titleById = new Map<string, string>();
    const unionIds = new Set<string>();

    for (const p of toAnalyze) {
      playlistNameById.set(p.id, p.name);
      // Skip playlists already known to be empty — no tracks to read, and avoids the
      // retry-on-empty cost of the pagination helper.
      if ((p.numberOfItems ?? 0) === 0) continue;
      let ids: string[];
      let titles: Map<string, string>;
      try {
        ({ ids, titles } = await fetchPlaylistItems(client, p.id, opts.pageRetryDelayMs));
      } catch {
        // A hard read failure means this playlist's membership is unknown — flag partial so
        // dedupe/gem detection isn't trusted blindly, and move on.
        partialMembership = true;
        continue;
      }
      for (const [id, title] of titles) if (title) titleById.set(id, title);
      for (const id of ids) {
        unionIds.add(id);
        let set = trackToPlaylistIds.get(id);
        if (!set) {
          set = new Set<string>();
          trackToPlaylistIds.set(id, set);
        }
        set.add(p.id);
      }
    }

    const dupEntries = [...trackToPlaylistIds.entries()].filter(([, plIds]) => plIds.size >= 2);
    duplicateCount = dupEntries.length;
    duplicates = dupEntries
      .slice(0, sampleLimit)
      .map(([id, plIds]) => ({
        trackId: id,
        title: titleById.get(id) ?? '(unknown track)',
        inPlaylists: [...plIds].map((pid) => playlistNameById.get(pid) ?? pid),
      }));

    const gemTracks = savedTracks.filter((t) => !unionIds.has(t.id));
    gemCount = gemTracks.length;
    gems = gemTracks.slice(0, sampleLimit).map((t) => ({ trackId: t.id, title: t.name }));

    if (truncatedPlaylists) {
      notes.push(
        `Analyzed the first ${maxPlaylists} of ${playlists.length} playlists; duplicate/gem detection covers those only.`,
      );
    }
    if (partialMembership) {
      notes.push(
        "Some playlists couldn't be read fully; duplicate/gem detection is partial for those.",
      );
    }
  }

  return {
    totals: {
      ownedPlaylists: playlists.length,
      favoritedPlaylists: favorited.length,
      savedForLaterItems: saved.length,
      savedByType,
    },
    playlists: {
      totalTracks,
      averageSize,
      emptyCount,
      largest,
      smallest,
      sizes: sizesSorted.slice(0, sampleLimit),
      stalest,
      recentlyModified,
    },
    savedArtists,
    duplicates: { count: duplicateCount, items: duplicates },
    forgottenGems: { count: gemCount, items: gems },
    recentActivity: { recentlyAddedTracks: recent.length },
    coverage: {
      analyzedPlaylists,
      totalPlaylists: playlists.length,
      truncatedPlaylists,
      partialMembership,
    },
    notes,
  };
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}

/**
 * Clean, human-readable summary for the `content` channel. No raw IDs, no ISO timestamps
 * (staleness is expressed in months/"a while"). Every MCP client reads this.
 */
export function buildLibrarySummary(a: LibraryAnalysis): string {
  const lines: string[] = [];
  const t = a.totals;

  let overview = `Library overview: ${t.ownedPlaylists} playlist${plural(t.ownedPlaylists)}`;
  if (t.favoritedPlaylists) overview += `, ${t.favoritedPlaylists} followed`;
  if (t.savedForLaterItems) overview += `, ${t.savedForLaterItems} saved-for-later item${plural(t.savedForLaterItems)}`;
  lines.push(overview + '.');

  if (a.playlists.totalTracks) {
    lines.push(`Playlists hold ${a.playlists.totalTracks} tracks (avg ${a.playlists.averageSize} per playlist).`);
  }
  if (a.playlists.largest) {
    let l = `Largest playlist: "${a.playlists.largest.name}" (${a.playlists.largest.trackCount} tracks)`;
    l += a.playlists.emptyCount
      ? `; ${a.playlists.emptyCount} empty playlist${plural(a.playlists.emptyCount)}.`
      : '.';
    lines.push(l);
  }
  if (a.playlists.stalest.length) {
    const names = a.playlists.stalest.slice(0, 3).map((s) => `"${s.name}"`).join(', ');
    const months = Math.floor(a.playlists.stalest[0].daysSinceModified / 30);
    const age = months >= 1 ? `untouched ~${months} month${plural(months)}` : 'recently touched';
    lines.push(`Stalest playlists (${age}): ${names}.`);
  }
  if (a.savedArtists.length) {
    lines.push(`Saved artists include: ${a.savedArtists.slice(0, 8).join(', ')}.`);
  }
  // Counts depend on full playlist membership; qualify them when coverage was incomplete.
  const incomplete = a.coverage.truncatedPlaylists || a.coverage.partialMembership;
  const scope = incomplete ? ' (among analyzed playlists)' : '';
  if (a.duplicates.count) {
    lines.push(`${a.duplicates.count} track${plural(a.duplicates.count)} appear in more than one playlist${scope}.`);
  }
  if (a.forgottenGems.count) {
    const verb = a.forgottenGems.count === 1 ? "isn't" : "aren't";
    const qualifier = incomplete ? 'may not be' : verb;
    lines.push(
      `${a.forgottenGems.count} saved-for-later track${plural(a.forgottenGems.count)} ${qualifier} in any playlist — possible forgotten gems.`,
    );
  }
  lines.push(`Analyzed ${a.coverage.analyzedPlaylists} of ${a.coverage.totalPlaylists} playlist${plural(a.coverage.totalPlaylists)}.`);
  for (const n of a.notes) lines.push(n);

  return lines.join('\n');
}
