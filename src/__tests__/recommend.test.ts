import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
  getCountryCode: vi.fn().mockResolvedValue('US'),
}));

import { getApiClient } from '../auth';
import { getRecommendationsData, getRecommendations } from '../recommend';

const mockClient = {
  GET: vi.fn(),
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

describe('getRecommendationsData', () => {
  it('queries all four mix categories when no category given', async () => {
    mockClient.GET.mockResolvedValue({ data: { included: [] } });

    await getRecommendationsData(mockClient, 'US');

    const paths = mockClient.GET.mock.calls.map((c: any[]) => c[0]);
    expect(paths).toContain('/userDailyMixes/{id}');
    expect(paths).toContain('/userDiscoveryMixes/{id}');
    expect(paths).toContain('/userNewReleaseMixes/{id}');
    expect(paths).toContain('/userOfflineMixes/{id}');
    expect(mockClient.GET).toHaveBeenCalledTimes(4);
  });

  it('queries only the requested category', async () => {
    mockClient.GET.mockResolvedValue({
      data: {
        included: [
          { id: 'mix-1', type: 'playlists', attributes: { title: 'Daily Mix 1' } },
        ],
      },
    });

    const result = await getRecommendationsData(mockClient, 'US', 'daily');

    expect(mockClient.GET).toHaveBeenCalledTimes(1);
    expect(mockClient.GET).toHaveBeenCalledWith('/userDailyMixes/{id}', expect.objectContaining({
      params: expect.objectContaining({ path: { id: 'me' } }),
    }));
    expect(result).toEqual([
      { id: 'mix-1', type: 'playlists', name: 'Daily Mix 1', category: 'daily' },
    ]);
  });

  it('returns empty array when a category errors out (e.g. offline without entitlement)', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: null, error: { status: 404 } });

    const result = await getRecommendationsData(mockClient, 'US', 'offline');
    expect(result).toEqual([]);
  });

  it('aggregates and tags items by category', async () => {
    mockClient.GET.mockImplementation((path: string) => {
      const map: Record<string, string> = {
        '/userDailyMixes/{id}': 'D',
        '/userDiscoveryMixes/{id}': 'X',
        '/userNewReleaseMixes/{id}': 'N',
        '/userOfflineMixes/{id}': 'O',
      };
      const tag = map[path];
      return Promise.resolve({
        data: {
          included: [{ id: `${tag}-1`, type: 'playlists', attributes: { title: `${tag} mix` } }],
        },
      });
    });

    const result = await getRecommendationsData(mockClient, 'US');

    expect(result).toHaveLength(4);
    const cats = result.map((r) => r.category).sort();
    expect(cats).toEqual(['daily', 'discovery', 'new-release', 'offline']);
  });
});

describe('getRecommendations (CLI wrapper)', () => {
  it('outputs JSON when requested', async () => {
    mockClient.GET.mockResolvedValue({
      data: { included: [{ id: 'm-1', type: 'playlists', attributes: { title: 'Mix 1' } }] },
    });

    await getRecommendations('daily', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual([{ id: 'm-1', type: 'playlists', name: 'Mix 1', category: 'daily' }]);
  });

  it('groups output by category in human mode', async () => {
    mockClient.GET.mockImplementation((path: string) => {
      if (path === '/userDailyMixes/{id}') {
        return Promise.resolve({ data: { included: [{ id: 'd-1', type: 'playlists', attributes: { title: 'Daily 1' } }] } });
      }
      return Promise.resolve({ data: { included: [] } });
    });

    await getRecommendations(undefined, false);

    expect(output.some((l) => l.includes('daily:'))).toBe(true);
    expect(output.some((l) => l.includes('Daily 1'))).toBe(true);
  });
});
