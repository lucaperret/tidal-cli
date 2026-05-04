import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
  getCountryCode: vi.fn().mockResolvedValue('US'),
}));

import { getApiClient } from '../auth';
import {
  listSearchHistoryData,
  listSearchHistory,
  deleteSearchHistoryEntry,
  clearSearchHistoryData,
} from '../search-history';

const mockClient = { GET: vi.fn(), DELETE: vi.fn() };

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

describe('listSearchHistoryData', () => {
  it('maps API response to entries', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { id: 'e-1', attributes: { query: 'daft punk' } },
          { id: 'e-2', attributes: { query: 'aphex twin' } },
        ],
      },
    });

    const result = await listSearchHistoryData(mockClient, 'US');

    expect(mockClient.GET).toHaveBeenCalledWith('/searchHistoryEntries', expect.any(Object));
    expect(result).toEqual([
      { id: 'e-1', query: 'daft punk' },
      { id: 'e-2', query: 'aphex twin' },
    ]);
  });

  it('throws on error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 500 } });
    await expect(listSearchHistoryData(mockClient, 'US')).rejects.toThrow(/Failed to list search history/);
  });
});

describe('listSearchHistory (CLI)', () => {
  it('shows empty message', async () => {
    mockClient.GET.mockResolvedValue({ data: { data: [] } });
    await listSearchHistory(false);
    expect(output.some((l) => l.includes('No search history'))).toBe(true);
  });

  it('outputs JSON', async () => {
    mockClient.GET.mockResolvedValue({
      data: { data: [{ id: 'e-1', attributes: { query: 'foo' } }] },
    });
    await listSearchHistory(true);
    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual([{ id: 'e-1', query: 'foo' }]);
  });
});

describe('deleteSearchHistoryEntry', () => {
  it('sends DELETE with id path', async () => {
    mockClient.DELETE.mockResolvedValue({ error: undefined });
    await deleteSearchHistoryEntry('e-1', false);
    expect(mockClient.DELETE).toHaveBeenCalledWith('/searchHistoryEntries/{id}', {
      params: { path: { id: 'e-1' } },
    });
  });

  it('exits on error', async () => {
    mockClient.DELETE.mockResolvedValue({ error: { status: 500 } });
    await expect(deleteSearchHistoryEntry('e-1', false)).rejects.toThrow('process.exit(1)');
  });
});

describe('clearSearchHistoryData', () => {
  it('lists then deletes each entry', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        data: [
          { id: 'e-1', attributes: { query: 'a' } },
          { id: 'e-2', attributes: { query: 'b' } },
        ],
      },
    });
    mockClient.DELETE.mockResolvedValue({ error: undefined });

    const result = await clearSearchHistoryData(mockClient, 'US');

    expect(mockClient.DELETE).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ deleted: 2 });
  });
});
