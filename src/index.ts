#!/usr/bin/env node

// Suppress "TrueTime is not yet synchronized" warnings from @tidal-music/auth
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('TrueTime')) return;
  originalWarn(...args);
};

import { Command } from 'commander';
import { authenticate, doLogout } from './auth';
import { search, searchSuggestions } from './search';
import {
  listPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  addAlbumToPlaylist,
  moveTrackInPlaylist,
  updatePlaylistDescription,
} from './playlist';
import { addToLibrary, removeFromLibrary, listFavoritedPlaylists, addPlaylistToFavorites, removePlaylistFromFavorites } from './library';
import { playbackInfo, playbackUrl, playbackPlay } from './playback';
import { getArtistInfo, getArtistRadio, getArtistTracks, getArtistAlbums, getSimilarArtists } from './artist';
import { getTrackInfo, getTrackRadio, getTrackByIsrc, getSimilarTracks } from './track';
import { getAlbumInfo, getAlbumByBarcode } from './album';
import { getRecommendations } from './recommend';
import type { MixCategory } from './recommend';
import { getMixItems } from './mix';
import { getUserProfile } from './user';
import { getRecentlyAdded } from './history';
import { listSearchHistory, deleteSearchHistoryEntry, clearSearchHistory } from './search-history';
import { listSavedItems, addSavedItem, removeSavedItem } from './saved';
import type { SavedItemType } from './saved';
import { createShare } from './share';
import type { ShareableType } from './share';

const MIX_CATEGORIES = ['daily', 'discovery', 'new-release', 'offline'] as const;

function parseMixCategory(value: string | undefined): MixCategory | undefined {
  if (!value) return undefined;
  if (!(MIX_CATEGORIES as readonly string[]).includes(value)) {
    console.error(`Error: invalid mix category "${value}". Use one of: ${MIX_CATEGORIES.join(', ')}`);
    process.exit(2);
  }
  return value as MixCategory;
}

const program = new Command();

program
  .name('tidal-cli')
  .description('CLI for Tidal music streaming service')
  .version('1.0.0')
  .option('--json', 'Output as JSON');

// Auth
program
  .command('auth')
  .description('Authenticate with Tidal (OAuth Authorization Code Flow)')
  .action(wrapAction(async () => {
    await authenticate();
  }));

program
  .command('logout')
  .description('Clear stored credentials')
  .action(wrapAction(async () => {
    await doLogout();
  }));

// Search
const searchCmd = program
  .command('search')
  .description('Search Tidal catalog');

searchCmd
  .command('artist <query>')
  .description('Search for artists')
  .action(wrapAction(async (query: string) => {
    await search('artist', query, getJson());
  }));

searchCmd
  .command('album <query>')
  .description('Search for albums')
  .action(wrapAction(async (query: string) => {
    await search('album', query, getJson());
  }));

searchCmd
  .command('track <query>')
  .description('Search for tracks')
  .action(wrapAction(async (query: string) => {
    await search('track', query, getJson());
  }));

searchCmd
  .command('video <query>')
  .description('Search for videos')
  .action(wrapAction(async (query: string) => {
    await search('video', query, getJson());
  }));

searchCmd
  .command('playlist <query>')
  .description('Search for playlists')
  .action(wrapAction(async (query: string) => {
    await search('playlist', query, getJson());
  }));

searchCmd
  .command('suggest <query>')
  .description('Get search suggestions')
  .action(wrapAction(async (query: string) => {
    await searchSuggestions(query, getJson());
  }));

searchCmd
  .command('editorial [genre]')
  .description('Browse editorial playlists by genre or keyword')
  .action(wrapAction(async (genre: string) => {
    await search('playlist', genre || 'top hits', getJson());
  }));

searchCmd
  .command('history')
  .description('List your search history')
  .action(wrapAction(async () => {
    await listSearchHistory(getJson());
  }));

searchCmd
  .command('history-delete <entry-id>')
  .description('Delete a single search history entry')
  .action(wrapAction(async (entryId: string) => {
    await deleteSearchHistoryEntry(entryId, getJson());
  }));

searchCmd
  .command('history-clear')
  .description('Clear all search history entries')
  .action(wrapAction(async () => {
    await clearSearchHistory(getJson());
  }));

// Artist
const artistCmd = program
  .command('artist')
  .description('Get artist information');

artistCmd
  .command('info <id>')
  .description('Get artist info')
  .action(wrapAction(async (id: string) => {
    await getArtistInfo(id, getJson());
  }));

artistCmd
  .command('tracks <id>')
  .description('Get top tracks for an artist')
  .action(wrapAction(async (id: string) => {
    await getArtistTracks(id, getJson());
  }));

artistCmd
  .command('albums <id>')
  .description('Get albums for an artist')
  .action(wrapAction(async (id: string) => {
    await getArtistAlbums(id, getJson());
  }));

artistCmd
  .command('similar <id>')
  .description('Get artists similar to a given artist')
  .action(wrapAction(async (id: string) => {
    await getSimilarArtists(id, getJson());
  }));

artistCmd
  .command('radio <id>')
  .description('Get radio tracks for an artist')
  .action(wrapAction(async (id: string) => {
    await getArtistRadio(id, getJson());
  }));

// Track
const trackCmd = program
  .command('track')
  .description('Get track information');

trackCmd
  .command('info <id>')
  .description('Get track info')
  .action(wrapAction(async (id: string) => {
    await getTrackInfo(id, getJson());
  }));

trackCmd
  .command('similar <id>')
  .description('Get tracks similar to a given track')
  .action(wrapAction(async (id: string) => {
    await getSimilarTracks(id, getJson());
  }));

trackCmd
  .command('radio <id>')
  .description('Get radio tracks for a track')
  .action(wrapAction(async (id: string) => {
    await getTrackRadio(id, getJson());
  }));

trackCmd
  .command('isrc <isrc>')
  .description('Find tracks by ISRC code')
  .action(wrapAction(async (isrc: string) => {
    await getTrackByIsrc(isrc, getJson());
  }));

// Album
const albumCmd = program
  .command('album')
  .description('Get album information');

albumCmd
  .command('info <id>')
  .description('Get album info')
  .action(wrapAction(async (id: string) => {
    await getAlbumInfo(id, getJson());
  }));

albumCmd
  .command('barcode <barcode>')
  .description('Find albums by barcode')
  .action(wrapAction(async (barcode: string) => {
    await getAlbumByBarcode(barcode, getJson());
  }));

// Recommend
program
  .command('recommend')
  .description('Get personalized recommendations')
  .option('--type <category>', `Mix category: ${MIX_CATEGORIES.join(', ')}`)
  .action(wrapAction(async (opts: { type?: string }) => {
    await getRecommendations(parseMixCategory(opts.type), getJson());
  }));

// Mix
const mixCmd = program
  .command('mix')
  .description('Browse personalized mix contents');

mixCmd
  .command('items <mix-id>')
  .description('Get items inside a specific mix')
  .requiredOption('--type <category>', `Mix category: ${MIX_CATEGORIES.join(', ')}`)
  .action(wrapAction(async (mixId: string, opts: { type: string }) => {
    const cat = parseMixCategory(opts.type);
    if (!cat) return;
    await getMixItems(cat, mixId, getJson());
  }));

// Share
program
  .command('share <type> <id>')
  .description('Create a share link for a track or album (type: track | album)')
  .action(wrapAction(async (type: string, id: string) => {
    const normalized = type === 'track' ? 'tracks' : type === 'album' ? 'albums' : null;
    if (!normalized) {
      console.error('Error: type must be "track" or "album"');
      process.exit(2);
    }
    await createShare(normalized as ShareableType, id, getJson());
  }));

// Saved (save for later)
const savedCmd = program
  .command('saved')
  .description('Manage your save-for-later collection');

savedCmd
  .command('list')
  .description('List items saved for later')
  .action(wrapAction(async () => {
    await listSavedItems(getJson());
  }));

savedCmd
  .command('add')
  .description('Save an item for later')
  .requiredOption('--type <type>', 'Item type: tracks, albums, artists, playlists, videos')
  .requiredOption('--id <id>', 'Item ID')
  .action(wrapAction(async (opts: { type: string; id: string }) => {
    const allowed: SavedItemType[] = ['tracks', 'albums', 'artists', 'playlists', 'videos'];
    if (!allowed.includes(opts.type as SavedItemType)) {
      console.error(`Error: invalid type. Use one of: ${allowed.join(', ')}`);
      process.exit(2);
    }
    await addSavedItem(opts.type as SavedItemType, opts.id, getJson());
  }));

savedCmd
  .command('remove')
  .description('Remove an item from saved')
  .requiredOption('--type <type>', 'Item type')
  .requiredOption('--id <id>', 'Item ID')
  .action(wrapAction(async (opts: { type: string; id: string }) => {
    const allowed: SavedItemType[] = ['tracks', 'albums', 'artists', 'playlists', 'videos'];
    if (!allowed.includes(opts.type as SavedItemType)) {
      console.error(`Error: invalid type. Use one of: ${allowed.join(', ')}`);
      process.exit(2);
    }
    await removeSavedItem(opts.type as SavedItemType, opts.id, getJson());
  }));

// User
const userCmd = program
  .command('user')
  .description('User account commands');

userCmd
  .command('profile')
  .description('Get your user profile')
  .action(wrapAction(async () => {
    await getUserProfile(getJson());
  }));

// Playlist
const playlistCmd = program
  .command('playlist')
  .description('Manage playlists');

playlistCmd
  .command('list')
  .description('List your playlists')
  .action(wrapAction(async () => {
    await listPlaylists(getJson());
  }));

playlistCmd
  .command('create')
  .description('Create a new playlist')
  .requiredOption('--name <name>', 'Playlist name')
  .option('--desc <description>', 'Playlist description', '')
  .action(wrapAction(async (opts: { name: string; desc: string }) => {
    await createPlaylist(opts.name, opts.desc, getJson());
  }));

playlistCmd
  .command('rename')
  .description('Rename a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--name <name>', 'New name')
  .action(wrapAction(async (opts: { playlistId: string; name: string }) => {
    await renamePlaylist(opts.playlistId, opts.name, getJson());
  }));

playlistCmd
  .command('delete')
  .description('Delete a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .action(wrapAction(async (opts: { playlistId: string }) => {
    await deletePlaylist(opts.playlistId, getJson());
  }));

playlistCmd
  .command('add-track')
  .description('Add a track to a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--track-id <id>', 'Track ID')
  .action(wrapAction(async (opts: { playlistId: string; trackId: string }) => {
    await addTrackToPlaylist(opts.playlistId, opts.trackId, getJson());
  }));

playlistCmd
  .command('remove-track')
  .description('Remove a track from a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--track-id <id>', 'Track ID')
  .action(wrapAction(async (opts: { playlistId: string; trackId: string }) => {
    await removeTrackFromPlaylist(opts.playlistId, opts.trackId, getJson());
  }));

playlistCmd
  .command('add-album')
  .description('Add all tracks from an album to a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--album-id <id>', 'Album ID')
  .action(wrapAction(async (opts: { playlistId: string; albumId: string }) => {
    await addAlbumToPlaylist(opts.playlistId, opts.albumId, getJson());
  }));

playlistCmd
  .command('move-track')
  .description('Move a track within a playlist')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--track-id <id>', 'Track ID to move')
  .requiredOption('--before <itemId>', 'Item ID to place before (use "end" for last position)')
  .action(wrapAction(async (opts: { playlistId: string; trackId: string; before: string }) => {
    await moveTrackInPlaylist(opts.playlistId, opts.trackId, opts.before, getJson());
  }));

playlistCmd
  .command('set-description')
  .description('Update playlist description')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .requiredOption('--desc <description>', 'New description')
  .action(wrapAction(async (opts: { playlistId: string; desc: string }) => {
    await updatePlaylistDescription(opts.playlistId, opts.desc, getJson());
  }));

// Library
const libraryCmd = program
  .command('library')
  .description('Manage your library/favorites');

libraryCmd
  .command('add')
  .description('Add an item to your library')
  .option('--artist-id <id>', 'Artist ID')
  .option('--album-id <id>', 'Album ID')
  .option('--track-id <id>', 'Track ID')
  .option('--video-id <id>', 'Video ID')
  .action(wrapAction(async (opts: { artistId?: string; albumId?: string; trackId?: string; videoId?: string }) => {
    const { type, id } = resolveLibraryArgs(opts);
    await addToLibrary(type, id, getJson());
  }));

libraryCmd
  .command('remove')
  .description('Remove an item from your library')
  .option('--artist-id <id>', 'Artist ID')
  .option('--album-id <id>', 'Album ID')
  .option('--track-id <id>', 'Track ID')
  .option('--video-id <id>', 'Video ID')
  .action(wrapAction(async (opts: { artistId?: string; albumId?: string; trackId?: string; videoId?: string }) => {
    const { type, id } = resolveLibraryArgs(opts);
    await removeFromLibrary(type, id, getJson());
  }));

libraryCmd
  .command('favorite-playlists')
  .description('List your favorited playlists')
  .action(wrapAction(async () => {
    await listFavoritedPlaylists(getJson());
  }));

libraryCmd
  .command('add-playlist')
  .description('Add a playlist to your favorites')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .action(wrapAction(async (opts: { playlistId: string }) => {
    await addPlaylistToFavorites(opts.playlistId, getJson());
  }));

libraryCmd
  .command('remove-playlist')
  .description('Remove a playlist from your favorites')
  .requiredOption('--playlist-id <id>', 'Playlist ID')
  .action(wrapAction(async (opts: { playlistId: string }) => {
    await removePlaylistFromFavorites(opts.playlistId, getJson());
  }));

// History
const historyCmd = program.command('history').description('Recently added to library');

historyCmd
  .command('tracks')
  .description('Recently added tracks')
  .action(wrapAction(async () => {
    await getRecentlyAdded('tracks', getJson());
  }));

historyCmd
  .command('albums')
  .description('Recently added albums')
  .action(wrapAction(async () => {
    await getRecentlyAdded('albums', getJson());
  }));

historyCmd
  .command('artists')
  .description('Recently added artists')
  .action(wrapAction(async () => {
    await getRecentlyAdded('artists', getJson());
  }));

// Playback
const playbackCmd = program
  .command('playback')
  .description('Track playback and streaming');

playbackCmd
  .command('info <track-id>')
  .description('Get playback info for a track')
  .option('--quality <quality>', 'Audio quality (LOW, HIGH, LOSSLESS, HI_RES)', 'HIGH')
  .action(wrapAction(async (trackId: string, opts: { quality: string }) => {
    await playbackInfo(trackId, opts.quality, getJson());
  }));

playbackCmd
  .command('url <track-id>')
  .description('Get direct stream URL for a track')
  .option('--quality <quality>', 'Audio quality (LOW, HIGH, LOSSLESS, HI_RES)', 'HIGH')
  .action(wrapAction(async (trackId: string, opts: { quality: string }) => {
    await playbackUrl(trackId, opts.quality, getJson());
  }));

playbackCmd
  .command('play <track-id>')
  .description('Play a track locally')
  .option('--quality <quality>', 'Audio quality (LOW, HIGH, LOSSLESS, HI_RES)', 'HIGH')
  .action(wrapAction(async (trackId: string, opts: { quality: string }) => {
    await playbackPlay(trackId, opts.quality);
  }));

function resolveLibraryArgs(opts: { artistId?: string; albumId?: string; trackId?: string; videoId?: string }): { type: 'artist' | 'album' | 'track' | 'video'; id: string } {
  if (opts.artistId) return { type: 'artist', id: opts.artistId };
  if (opts.albumId) return { type: 'album', id: opts.albumId };
  if (opts.trackId) return { type: 'track', id: opts.trackId };
  if (opts.videoId) return { type: 'video', id: opts.videoId };
  console.error('Error: Must specify one of --artist-id, --album-id, --track-id, or --video-id');
  process.exit(2);
}

function getJson(): boolean {
  return program.opts().json ?? false;
}

function wrapAction(fn: (...args: any[]) => Promise<void>): (...args: any[]) => void {
  return (...args: any[]) => {
    fn(...args).catch((err: Error) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
  };
}

program.parse();
