import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
  getCountryCode: vi.fn().mockResolvedValue('US'),
}));

import { getApiClient } from '../auth';
import {
  addToLibrary,
  removeFromLibrary,
  listFavoritedPlaylists,
  addPlaylistToFavorites,
  removePlaylistFromFavorites,
} from '../library';

const mockClient = {
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
};

let output: string[] = [];
let errorOutput: string[] = [];

beforeEach(() => {
  output = [];
  errorOutput = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...args) => errorOutput.push(args.join(' ')));
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.clearAllMocks();
  (getApiClient as any).mockResolvedValue(mockClient);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addToLibrary', () => {
  const types = [
    { type: 'artist' as const, path: '/userCollectionArtists/{id}/relationships/items', apiType: 'artists' },
    { type: 'album' as const, path: '/userCollectionAlbums/{id}/relationships/items', apiType: 'albums' },
    { type: 'track' as const, path: '/userCollectionTracks/{id}/relationships/items', apiType: 'tracks' },
    { type: 'video' as const, path: '/userCollectionVideos/{id}/relationships/items', apiType: 'videos' },
  ];

  for (const { type, path, apiType } of types) {
    it(`adds ${type} to library with correct endpoint`, async () => {
      mockClient.POST.mockResolvedValue({ error: undefined });

      await addToLibrary(type, 'res-123', false);

      expect(mockClient.POST).toHaveBeenCalledWith(path, {
        params: { path: { id: 'me' } },
        body: {
          data: [{ id: 'res-123', type: apiType }],
        },
      });

      const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
      expect(output.some((l) => l.includes(`${capitalized} res-123 added to your library`))).toBe(true);
    });
  }

  it('outputs JSON on add', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addToLibrary('track', 't-1', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ resourceType: 'track', resourceId: 't-1', added: true });
  });

  it('exits on error', async () => {
    mockClient.POST.mockResolvedValue({ error: { status: 403 } });

    await expect(addToLibrary('track', 't-1', false)).rejects.toThrow('process.exit(1)');
    expect(errorOutput.some((l) => l.includes('Failed to add track to library'))).toBe(true);
  });
});

describe('removeFromLibrary', () => {
  it('sends DELETE for artist', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removeFromLibrary('artist', 'a-1', false);

    expect(mockClient.DELETE).toHaveBeenCalledWith('/userCollectionArtists/{id}/relationships/items', {
      params: { path: { id: 'me' } },
      body: {
        data: [{ id: 'a-1', type: 'artists' }],
      },
    });

    expect(output.some((l) => l.includes('Artist a-1 removed from your library'))).toBe(true);
  });

  it('outputs JSON on remove', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removeFromLibrary('album', 'alb-1', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ resourceType: 'album', resourceId: 'alb-1', removed: true });
  });

  it('exits on error', async () => {
    mockClient.DELETE.mockResolvedValue({ error: { status: 500 } });

    await expect(removeFromLibrary('track', 't-1', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('listFavoritedPlaylists', () => {
  it('lists favorited playlists', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { type: 'playlists', id: 'pl-fav-1' },
          { type: 'playlists', id: 'pl-fav-2' },
        ],
        included: [
          {
            id: 'pl-fav-1',
            type: 'playlists',
            attributes: { name: 'Discover Weekly', numberOfItems: 30 },
          },
          {
            id: 'pl-fav-2',
            type: 'playlists',
            attributes: { name: 'Release Radar', numberOfItems: 50 },
          },
        ],
      },
    });

    await listFavoritedPlaylists(false);

    expect(output.some((l) => l.includes('[pl-fav-1] Discover Weekly (30 items)'))).toBe(true);
    expect(output.some((l) => l.includes('[pl-fav-2] Release Radar (50 items)'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [{ type: 'playlists', id: 'pl-1' }],
        included: [
          { id: 'pl-1', type: 'playlists', attributes: { name: 'Fav PL', numberOfItems: 10 } },
        ],
      },
    });

    await listFavoritedPlaylists(true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Fav PL');
  });

  it('shows empty message when no favorites', async () => {
    mockClient.GET.mockResolvedValue({ data: { included: [] } });

    await listFavoritedPlaylists(false);

    expect(output.some((l) => l.includes('No favorited playlists found'))).toBe(true);
  });

  it('exits on error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 500 } });

    await expect(listFavoritedPlaylists(false)).rejects.toThrow('process.exit(1)');
  });

  it('follows cursor pagination across multiple pages', async () => {
    mockClient.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ type: 'playlists', id: 'pl-1' }],
          included: [
            { id: 'pl-1', type: 'playlists', attributes: { name: 'Page1', numberOfItems: 10 } },
          ],
          links: {
            next: '/userCollectionPlaylists/me/relationships/items?page%5Bcursor%5D=CURSOR2',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ type: 'playlists', id: 'pl-2' }],
          included: [
            { id: 'pl-2', type: 'playlists', attributes: { name: 'Page2', numberOfItems: 20 } },
          ],
          links: {}, // no `next` -> stop
        },
      });

    await listFavoritedPlaylists(false);

    expect(mockClient.GET).toHaveBeenCalledTimes(2);
    expect(mockClient.GET.mock.calls[1][1].params.query['page[cursor]']).toBe('CURSOR2');
    expect(output.some((l) => l.includes('[pl-1] Page1'))).toBe(true);
    expect(output.some((l) => l.includes('[pl-2] Page2'))).toBe(true);
  });
});

describe('addPlaylistToFavorites', () => {
  it('sends POST to favorites endpoint', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addPlaylistToFavorites('pl-99', false);

    expect(mockClient.POST).toHaveBeenCalledWith('/userCollectionPlaylists/{id}/relationships/items', {
      params: { path: { id: 'me' } },
      body: {
        data: [{ id: 'pl-99', type: 'playlists' }],
      },
    });

    expect(output.some((l) => l.includes('pl-99 added to favorites'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addPlaylistToFavorites('pl-99', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ playlistId: 'pl-99', added: true });
  });

  it('exits on error', async () => {
    mockClient.POST.mockResolvedValue({ error: { status: 400 } });

    await expect(addPlaylistToFavorites('pl-99', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('removePlaylistFromFavorites', () => {
  it('sends DELETE to favorites endpoint', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removePlaylistFromFavorites('pl-99', false);

    expect(mockClient.DELETE).toHaveBeenCalledWith('/userCollectionPlaylists/{id}/relationships/items', {
      params: { path: { id: 'me' } },
      body: {
        data: [{ id: 'pl-99', type: 'playlists' }],
      },
    });

    expect(output.some((l) => l.includes('pl-99 removed from favorites'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removePlaylistFromFavorites('pl-99', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ playlistId: 'pl-99', removed: true });
  });

  it('exits on error', async () => {
    mockClient.DELETE.mockResolvedValue({ error: { status: 500 } });

    await expect(removePlaylistFromFavorites('pl-99', false)).rejects.toThrow('process.exit(1)');
  });
});
