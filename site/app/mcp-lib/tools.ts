import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAPIClient } from '@tidal-music/api';

import { searchData, searchSuggestionsData } from '../../lib/cli/search';
import { getArtistInfoData, getArtistTracksData, getArtistAlbumsData, getSimilarArtistsData, getArtistRadioData } from '../../lib/cli/artist';
import { getTrackInfoData, getTrackRadioData, getTrackByIsrcData, getSimilarTracksData } from '../../lib/cli/track';
import { getAlbumInfoData, getAlbumByBarcodeData } from '../../lib/cli/album';
import { listPlaylistsData, createPlaylistData, renamePlaylistData, deletePlaylistData, addTrackToPlaylistData, removeTrackFromPlaylistData, addAlbumToPlaylistData, moveTrackInPlaylistData, updatePlaylistDescriptionData } from '../../lib/cli/playlist';
import { addToLibraryData, removeFromLibraryData, listFavoritedPlaylistsData, addPlaylistToFavoritesData, removePlaylistFromFavoritesData } from '../../lib/cli/library';
import { playbackInfoData, playbackUrlData } from '../../lib/cli/playback';
import { getRecommendationsData } from '../../lib/cli/recommend';
import { getRecentlyAddedData } from '../../lib/cli/history';
import { getUserProfileData } from '../../lib/cli/user';

import { getTidalTokens, getAccessTokenUserId, saveTidalTokens } from './redis';
import { refreshTidalToken } from './tidal-oauth';

async function getClientAndCountry(bearerToken: string): Promise<{ client: any; countryCode: string }> {
  const userId = await getAccessTokenUserId(bearerToken);
  if (!userId) throw new Error('Unauthorized: invalid token');

  let tokens = await getTidalTokens(userId);
  if (!tokens) throw new Error('Unauthorized: no Tidal session');

  // Refresh if expired
  if (tokens.expiresAt < Date.now() + 60000) {
    const refreshed = await refreshTidalToken(tokens.refreshToken);
    tokens = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      countryCode: tokens.countryCode,
      userId: tokens.userId,
    };
    await saveTidalTokens(userId, tokens);
  }

  // Create API client with a custom credentials provider
  const credentialsProvider = {
    bus: new EventTarget(),
    getCredentials: async () => ({
      clientId: 'PYVtmSHMTGI9oBUs',
      requestedScopes: [],
      grantedScopes: [],
      token: tokens!.accessToken,
      expires: tokens!.expiresAt,
      userId: tokens!.userId,
    }),
  };

  const client = createAPIClient(credentialsProvider as any);
  const countryCode = tokens.countryCode || 'US';

  return { client, countryCode };
}

function text(data: any): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function extractToken(extra: any): string {
  const token = extra?.authInfo?.token;
  if (!token) throw new Error('Unauthorized');
  return token;
}

export function registerTools(server: McpServer) {
  // === Search ===
  server.tool('tidal_search', 'Search Tidal for artists, albums, tracks, videos, or playlists', {
    type: z.enum(['artist', 'album', 'track', 'video', 'playlist']).describe('Type of content to search'),
    query: z.string().describe('Search query'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Search Tidal' },
  async ({ type, query }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await searchData(type, query, client, countryCode));
  });

  server.tool('tidal_search_suggestions', 'Get search suggestions and direct hits for a query', {
    query: z.string().describe('Search query'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Search Suggestions' },
  async ({ query }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await searchSuggestionsData(query, client, countryCode));
  });

  // === Artist ===
  server.tool('tidal_artist_info', 'Get artist details including biography', {
    artistId: z.string().describe('Tidal artist ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Artist Info' },
  async ({ artistId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getArtistInfoData(artistId, client, countryCode));
  });

  server.tool('tidal_artist_tracks', 'Get top tracks for an artist', {
    artistId: z.string().describe('Tidal artist ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Artist Tracks' },
  async ({ artistId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getArtistTracksData(artistId, client, countryCode));
  });

  server.tool('tidal_artist_albums', 'Get albums by an artist', {
    artistId: z.string().describe('Tidal artist ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Artist Albums' },
  async ({ artistId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getArtistAlbumsData(artistId, client, countryCode));
  });

  server.tool('tidal_similar_artists', 'Find artists similar to a given artist', {
    artistId: z.string().describe('Tidal artist ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Similar Artists' },
  async ({ artistId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getSimilarArtistsData(artistId, client, countryCode));
  });

  server.tool('tidal_artist_radio', 'Get radio playlists based on an artist', {
    artistId: z.string().describe('Tidal artist ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Artist Radio' },
  async ({ artistId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getArtistRadioData(artistId, client, countryCode));
  });

  // === Track ===
  server.tool('tidal_track_info', 'Get track details including artists, album, BPM, key', {
    trackId: z.string().describe('Tidal track ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Track Info' },
  async ({ trackId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getTrackInfoData(trackId, client, countryCode));
  });

  server.tool('tidal_track_radio', 'Get radio playlists based on a track', {
    trackId: z.string().describe('Tidal track ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Track Radio' },
  async ({ trackId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getTrackRadioData(trackId, client, countryCode));
  });

  server.tool('tidal_track_by_isrc', 'Find tracks by ISRC code', {
    isrc: z.string().describe('ISRC code (e.g., USRC11700101)'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Track by ISRC' },
  async ({ isrc }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getTrackByIsrcData(isrc, client, countryCode));
  });

  server.tool('tidal_similar_tracks', 'Find tracks similar to a given track', {
    trackId: z.string().describe('Tidal track ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Similar Tracks' },
  async ({ trackId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getSimilarTracksData(trackId, client, countryCode));
  });

  // === Album ===
  server.tool('tidal_album_info', 'Get album details including artists and cover art', {
    albumId: z.string().describe('Tidal album ID'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Album Info' },
  async ({ albumId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getAlbumInfoData(albumId, client, countryCode));
  });

  server.tool('tidal_album_by_barcode', 'Find albums by barcode/UPC', {
    barcode: z.string().describe('Album barcode (UPC/EAN)'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Album by Barcode' },
  async ({ barcode }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getAlbumByBarcodeData(barcode, client, countryCode));
  });

  // === Playlist ===
  server.tool('tidal_playlist_list', 'List your playlists', {},
  { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'List Playlists' },
  async (_args, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await listPlaylistsData(client, countryCode));
  });

  server.tool('tidal_playlist_create', 'Create a new playlist', {
    name: z.string().describe('Playlist name'),
    description: z.string().optional().default('').describe('Playlist description'),
  }, { readOnlyHint: false, destructiveHint: false, openWorldHint: true, title: 'Create Playlist' },
  async ({ name, description }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await createPlaylistData(name, description, client));
  });

  server.tool('tidal_playlist_rename', 'Rename a playlist', {
    playlistId: z.string().describe('Playlist ID'),
    name: z.string().describe('New name'),
  }, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true, title: 'Rename Playlist' },
  async ({ playlistId, name }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await renamePlaylistData(playlistId, name, client));
  });

  server.tool('tidal_playlist_delete', 'Delete a playlist', {
    playlistId: z.string().describe('Playlist ID'),
  }, { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true, title: 'Delete Playlist' },
  async ({ playlistId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await deletePlaylistData(playlistId, client));
  });

  server.tool('tidal_playlist_add_track', 'Add a track to a playlist', {
    playlistId: z.string().describe('Playlist ID'),
    trackId: z.string().describe('Track ID'),
  }, { readOnlyHint: false, destructiveHint: false, openWorldHint: true, title: 'Add Track to Playlist' },
  async ({ playlistId, trackId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await addTrackToPlaylistData(playlistId, trackId, client));
  });

  server.tool('tidal_playlist_remove_track', 'Remove a track from a playlist', {
    playlistId: z.string().describe('Playlist ID'),
    trackId: z.string().describe('Track ID'),
  }, { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true, title: 'Remove Track from Playlist' },
  async ({ playlistId, trackId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await removeTrackFromPlaylistData(playlistId, trackId, client));
  });

  server.tool('tidal_playlist_add_album', 'Add all tracks from an album to a playlist', {
    playlistId: z.string().describe('Playlist ID'),
    albumId: z.string().describe('Album ID'),
  }, { readOnlyHint: false, destructiveHint: false, openWorldHint: true, title: 'Add Album to Playlist' },
  async ({ playlistId, albumId }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await addAlbumToPlaylistData(playlistId, albumId, client, countryCode));
  });

  server.tool('tidal_playlist_move_track', 'Move a track to a different position in a playlist', {
    playlistId: z.string().describe('Playlist ID'),
    trackId: z.string().describe('Track ID'),
    positionBefore: z.string().optional().default('end').describe('Item ID to place before, or "end"'),
  }, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true, title: 'Move Track in Playlist' },
  async ({ playlistId, trackId, positionBefore }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await moveTrackInPlaylistData(playlistId, trackId, positionBefore, client));
  });

  server.tool('tidal_playlist_update_description', 'Update playlist description', {
    playlistId: z.string().describe('Playlist ID'),
    description: z.string().describe('New description'),
  }, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true, title: 'Update Playlist Description' },
  async ({ playlistId, description }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await updatePlaylistDescriptionData(playlistId, description, client));
  });

  // === Library ===
  server.tool('tidal_library_add', 'Add an item to your library/favorites', {
    resourceType: z.enum(['artist', 'album', 'track', 'video']).describe('Type of item'),
    resourceId: z.string().describe('Item ID'),
  }, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true, title: 'Add to Library' },
  async ({ resourceType, resourceId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await addToLibraryData(resourceType, resourceId, client));
  });

  server.tool('tidal_library_remove', 'Remove an item from your library/favorites', {
    resourceType: z.enum(['artist', 'album', 'track', 'video']).describe('Type of item'),
    resourceId: z.string().describe('Item ID'),
  }, { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true, title: 'Remove from Library' },
  async ({ resourceType, resourceId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await removeFromLibraryData(resourceType, resourceId, client));
  });

  server.tool('tidal_library_favorited_playlists', 'List your favorited playlists', {},
  { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Favorited Playlists' },
  async (_args, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await listFavoritedPlaylistsData(client));
  });

  server.tool('tidal_library_add_playlist_favorite', 'Add a playlist to favorites', {
    playlistId: z.string().describe('Playlist ID'),
  }, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true, title: 'Favorite Playlist' },
  async ({ playlistId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await addPlaylistToFavoritesData(playlistId, client));
  });

  server.tool('tidal_library_remove_playlist_favorite', 'Remove a playlist from favorites', {
    playlistId: z.string().describe('Playlist ID'),
  }, { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true, title: 'Unfavorite Playlist' },
  async ({ playlistId }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await removePlaylistFromFavoritesData(playlistId, client));
  });

  // === Playback ===
  server.tool('tidal_playback_info', 'Get playback/streaming info for a track', {
    trackId: z.string().describe('Track ID'),
    quality: z.enum(['LOW', 'HIGH', 'LOSSLESS', 'HI_RES']).optional().default('HIGH').describe('Audio quality'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Playback Info' },
  async ({ trackId, quality }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await playbackInfoData(trackId, quality, client));
  });

  server.tool('tidal_playback_url', 'Get stream URL for a track', {
    trackId: z.string().describe('Track ID'),
    quality: z.enum(['LOW', 'HIGH', 'LOSSLESS', 'HI_RES']).optional().default('HIGH').describe('Audio quality'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Playback URL' },
  async ({ trackId, quality }, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await playbackUrlData(trackId, quality, client));
  });

  // === Recommendations ===
  server.tool('tidal_recommendations', 'Get personalized music recommendations', {},
  { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Recommendations' },
  async (_args, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getRecommendationsData(client, countryCode));
  });

  // === History ===
  server.tool('tidal_recently_added', 'Get recently added items from your library', {
    type: z.enum(['tracks', 'albums', 'artists']).describe('Type of items'),
  }, { readOnlyHint: true, destructiveHint: false, openWorldHint: true, title: 'Recently Added' },
  async ({ type }, extra) => {
    const { client, countryCode } = await getClientAndCountry(extractToken(extra));
    return text(await getRecentlyAddedData(type, client, countryCode));
  });

  // === User ===
  server.tool('tidal_user_profile', 'Get your Tidal user profile', {},
  { readOnlyHint: true, destructiveHint: false, openWorldHint: false, title: 'User Profile' },
  async (_args, extra) => {
    const { client } = await getClientAndCountry(extractToken(extra));
    return text(await getUserProfileData(client));
  });
}
