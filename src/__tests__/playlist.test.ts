import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
  getCountryCode: vi.fn().mockResolvedValue('US'),
}));

import { getApiClient, getCountryCode } from '../auth';
import {
  listPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  moveTrackInPlaylist,
  updatePlaylistDescription,
} from '../playlist';

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
  (getCountryCode as any).mockResolvedValue('US');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listPlaylists', () => {
  it('lists playlists in text mode', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          {
            id: 'pl-1',
            attributes: {
              name: 'My Playlist',
              description: 'A great playlist',
              numberOfItems: 15,
              createdAt: '2024-01-01',
              lastModifiedAt: '2024-06-01',
            },
          },
          {
            id: 'pl-2',
            attributes: {
              name: 'Workout Mix',
              numberOfItems: 30,
            },
          },
        ],
      },
    });

    await listPlaylists(false);

    expect(output.some((l) => l.includes('[pl-1] My Playlist (15 tracks)'))).toBe(true);
    expect(output.some((l) => l.includes('[pl-2] Workout Mix (30 tracks)'))).toBe(true);
    expect(output.some((l) => l.includes('A great playlist'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { id: 'pl-1', attributes: { name: 'Test', numberOfItems: 5 } },
        ],
      },
    });

    await listPlaylists(true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('pl-1');
    expect(parsed[0].name).toBe('Test');
  });

  it('shows empty message when no playlists', async () => {
    mockClient.GET.mockResolvedValue({ data: { data: [] } });

    await listPlaylists(false);

    expect(output.some((l) => l.includes('No playlists found'))).toBe(true);
  });

  it('exits on error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 500 } });

    await expect(listPlaylists(false)).rejects.toThrow('process.exit(1)');
  });

  it('follows cursor pagination across multiple pages', async () => {
    mockClient.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'pl-1', attributes: { name: 'Page1', numberOfItems: 1 } }],
          links: { next: '/playlists?filter%5Bowners.id%5D=me&page%5Bcursor%5D=CURSOR2' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'pl-2', attributes: { name: 'Page2', numberOfItems: 2 } }],
          links: {}, // no `next` -> stop
        },
      });

    await listPlaylists(false);

    expect(mockClient.GET).toHaveBeenCalledTimes(2);
    // second call carries the cursor
    expect(mockClient.GET.mock.calls[1][1].params.query['page[cursor]']).toBe('CURSOR2');
    expect(output.some((l) => l.includes('[pl-1] Page1'))).toBe(true);
    expect(output.some((l) => l.includes('[pl-2] Page2'))).toBe(true);
  });
});

describe('createPlaylist', () => {
  it('creates a playlist with accessType UNLISTED', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: {
          id: 'new-pl',
          attributes: { name: 'New Playlist', description: 'My new playlist' },
        },
      },
    });

    await createPlaylist('New Playlist', 'My new playlist', false);

    // Verify the POST was called with accessType: 'UNLISTED'
    expect(mockClient.POST).toHaveBeenCalledWith('/playlists', {
      body: {
        data: {
          type: 'playlists',
          attributes: {
            name: 'New Playlist',
            description: 'My new playlist',
            accessType: 'UNLISTED',
          },
        },
      },
    });

    expect(output.some((l) => l.includes('[new-pl] New Playlist'))).toBe(true);
  });

  it('does NOT use PRIVATE or PUBLIC accessType', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: { id: 'pl', attributes: { name: 'Test' } },
      },
    });

    await createPlaylist('Test', '', false);

    const callBody = mockClient.POST.mock.calls[0][1].body;
    expect(callBody.data.attributes.accessType).toBe('UNLISTED');
    expect(callBody.data.attributes.accessType).not.toBe('PRIVATE');
    expect(callBody.data.attributes.accessType).not.toBe('PUBLIC');
  });

  it('outputs JSON on create', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: { id: 'pl-x', attributes: { name: 'JSON PL', description: 'desc' } },
      },
    });

    await createPlaylist('JSON PL', 'desc', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed.id).toBe('pl-x');
    expect(parsed.name).toBe('JSON PL');
  });

  it('exits on error', async () => {
    mockClient.POST.mockResolvedValue({ data: null, error: { status: 400 } });

    await expect(createPlaylist('Fail', '', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('renamePlaylist', () => {
  it('sends PATCH with new name', async () => {
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await renamePlaylist('pl-1', 'Renamed', false);

    expect(mockClient.PATCH).toHaveBeenCalledWith('/playlists/{id}', {
      params: { path: { id: 'pl-1' } },
      body: {
        data: {
          type: 'playlists',
          id: 'pl-1',
          attributes: { name: 'Renamed' },
        },
      },
    });

    expect(output.some((l) => l.includes('renamed to "Renamed"'))).toBe(true);
  });

  it('outputs JSON on rename', async () => {
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await renamePlaylist('pl-1', 'New Name', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ id: 'pl-1', name: 'New Name', success: true });
  });

  it('exits on error', async () => {
    mockClient.PATCH.mockResolvedValue({ error: { status: 404 } });

    await expect(renamePlaylist('pl-1', 'X', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('deletePlaylist', () => {
  it('sends DELETE request', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await deletePlaylist('pl-1', false);

    expect(mockClient.DELETE).toHaveBeenCalledWith('/playlists/{id}', {
      params: { path: { id: 'pl-1' } },
    });

    expect(output.some((l) => l.includes('pl-1 deleted'))).toBe(true);
  });

  it('outputs JSON on delete', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await deletePlaylist('pl-1', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ id: 'pl-1', deleted: true });
  });

  it('exits on error', async () => {
    mockClient.DELETE.mockResolvedValue({ error: { status: 403 } });

    await expect(deletePlaylist('pl-1', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('addTrackToPlaylist', () => {
  it('sends POST with track data', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addTrackToPlaylist('pl-1', 't-100', false);

    expect(mockClient.POST).toHaveBeenCalledWith('/playlists/{id}/relationships/items', {
      params: { path: { id: 'pl-1' } },
      body: {
        data: [{ id: 't-100', type: 'tracks' }],
      },
    });

    expect(output.some((l) => l.includes('t-100 added to playlist pl-1'))).toBe(true);
  });

  it('outputs JSON on add', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addTrackToPlaylist('pl-1', 't-100', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ playlistId: 'pl-1', trackId: 't-100', added: true });
  });
});

describe('removeTrackFromPlaylist', () => {
  it('first GETs items to find itemId, then DELETEs', async () => {
    // First call: GET items
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { id: 't-50', meta: { itemId: 'item-abc' } },
          { id: 't-100', meta: { itemId: 'item-xyz' } },
        ],
      },
    });

    // Second call: DELETE
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removeTrackFromPlaylist('pl-1', 't-100', false);

    // Verify GET was called first
    expect(mockClient.GET).toHaveBeenCalledWith('/playlists/{id}/relationships/items', {
      params: { path: { id: 'pl-1' } },
    });

    // Verify DELETE uses the correct meta.itemId
    expect(mockClient.DELETE).toHaveBeenCalledWith('/playlists/{id}/relationships/items', {
      params: { path: { id: 'pl-1' } },
      body: {
        data: [{ id: 't-100', type: 'tracks', meta: { itemId: 'item-xyz' } }],
      },
    });

    expect(output.some((l) => l.includes('t-100 removed from playlist pl-1'))).toBe(true);
  });

  it('exits when track not found in playlist', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [{ id: 't-other', meta: { itemId: 'item-1' } }],
      },
    });

    await expect(removeTrackFromPlaylist('pl-1', 't-missing', false)).rejects.toThrow('process.exit(1)');
    expect(errorOutput.some((l) => l.includes('t-missing not found'))).toBe(true);
  });

  it('outputs JSON on remove', async () => {
    mockClient.GET.mockResolvedValue({
      data: { data: [{ id: 't-100', meta: { itemId: 'item-1' } }] },
    });
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removeTrackFromPlaylist('pl-1', 't-100', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ playlistId: 'pl-1', trackId: 't-100', removed: true });
  });
});

describe('updatePlaylistDescription', () => {
  it('sends PATCH with description in body', async () => {
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await updatePlaylistDescription('pl-1', 'New description', false);

    expect(mockClient.PATCH).toHaveBeenCalledWith('/playlists/{id}', {
      params: { path: { id: 'pl-1' } },
      body: {
        data: {
          type: 'playlists',
          id: 'pl-1',
          attributes: { description: 'New description' },
        },
      },
    });

    expect(output.some((l) => l.includes('description updated'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await updatePlaylistDescription('pl-1', 'Updated', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ id: 'pl-1', description: 'Updated', success: true });
  });

  it('exits on error', async () => {
    mockClient.PATCH.mockResolvedValue({ error: { status: 500 } });

    await expect(updatePlaylistDescription('pl-1', 'x', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('moveTrackInPlaylist', () => {
  it('GETs items then PATCHes with itemId and positionBefore', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { id: 't-1', meta: { itemId: 'item-aaa' } },
          { id: 't-2', meta: { itemId: 'item-bbb' } },
        ],
      },
    });
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await moveTrackInPlaylist('pl-1', 't-2', 'item-aaa', false);

    expect(mockClient.GET).toHaveBeenCalledWith('/playlists/{id}/relationships/items', {
      params: { path: { id: 'pl-1' } },
    });

    expect(mockClient.PATCH).toHaveBeenCalledWith('/playlists/{id}/relationships/items', {
      params: { path: { id: 'pl-1' } },
      body: {
        data: [{ id: 't-2', type: 'tracks', meta: { itemId: 'item-bbb' } }],
        meta: { positionBefore: 'item-aaa' },
      },
    });
  });

  it('moves to end when positionBefore is "end"', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [{ id: 't-1', meta: { itemId: 'item-aaa' } }],
      },
    });
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await moveTrackInPlaylist('pl-1', 't-1', 'end', false);

    const patchBody = mockClient.PATCH.mock.calls[0][1].body;
    expect(patchBody.meta).toEqual({});
    expect(output.some((l) => l.includes('to end of playlist'))).toBe(true);
  });

  it('exits when track not found', async () => {
    mockClient.GET.mockResolvedValue({
      data: { data: [{ id: 't-other', meta: { itemId: 'x' } }] },
    });

    await expect(moveTrackInPlaylist('pl-1', 't-missing', 'x', false)).rejects.toThrow('process.exit(1)');
  });

  it('outputs JSON on move', async () => {
    mockClient.GET.mockResolvedValue({
      data: { data: [{ id: 't-1', meta: { itemId: 'item-1' } }] },
    });
    mockClient.PATCH.mockResolvedValue({ error: undefined });

    await moveTrackInPlaylist('pl-1', 't-1', 'item-x', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ playlistId: 'pl-1', trackId: 't-1', positionBefore: 'item-x', moved: true });
  });
});
