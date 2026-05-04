import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../auth';
import {
  listSavedItemsData,
  addSavedItem,
  removeSavedItem,
  listSavedItems,
} from '../saved';

const mockClient = { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() };

let output: string[] = [];

beforeEach(() => {
  output = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.clearAllMocks();
  (getApiClient as any).mockResolvedValue(mockClient);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listSavedItemsData', () => {
  it('reads included resources', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        included: [
          { id: 't-1', type: 'tracks', attributes: { title: 'Song' } },
          { id: 'a-1', type: 'albums', attributes: { title: 'Album' } },
        ],
      },
    });

    const items = await listSavedItemsData(mockClient);

    expect(mockClient.GET).toHaveBeenCalledWith('/userCollectionSaveForLaters/{id}/relationships/items', expect.objectContaining({
      params: expect.objectContaining({ path: { id: 'me' } }),
    }));
    expect(items).toEqual([
      { id: 't-1', type: 'tracks', name: 'Song' },
      { id: 'a-1', type: 'albums', name: 'Album' },
    ]);
  });

  it('throws on error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 500 } });
    await expect(listSavedItemsData(mockClient)).rejects.toThrow(/Failed to list saved items/);
  });
});

describe('listSavedItems CLI', () => {
  it('handles empty list', async () => {
    mockClient.GET.mockResolvedValue({ data: { included: [] } });
    await listSavedItems(false);
    expect(output.some((l) => l.includes('No saved items'))).toBe(true);
  });
});

describe('addSavedItem', () => {
  it('POSTs with type-typed body', async () => {
    mockClient.POST.mockResolvedValue({ error: undefined });

    await addSavedItem('tracks', 't-99', false);

    expect(mockClient.POST).toHaveBeenCalledWith('/userCollectionSaveForLaters/{id}/relationships/items', {
      params: { path: { id: 'me' } },
      body: { data: [{ id: 't-99', type: 'tracks' }] },
    });
  });

  it('exits on error', async () => {
    mockClient.POST.mockResolvedValue({ error: { status: 400 } });
    await expect(addSavedItem('tracks', 't-99', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('removeSavedItem', () => {
  it('DELETEs with type-typed body', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    await removeSavedItem('albums', 'a-1', false);

    expect(mockClient.DELETE).toHaveBeenCalledWith('/userCollectionSaveForLaters/{id}/relationships/items', {
      params: { path: { id: 'me' } },
      body: { data: [{ id: 'a-1', type: 'albums' }] },
    });
  });

  it('JSON output', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });
    await removeSavedItem('tracks', 't-1', true);
    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual({ id: 't-1', type: 'tracks', removed: true });
  });
});
