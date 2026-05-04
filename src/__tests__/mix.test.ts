import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
  getCountryCode: vi.fn().mockResolvedValue('US'),
}));

import { getApiClient } from '../auth';
import { getMixItemsData, getMixItems } from '../mix';

const mockClient = { GET: vi.fn() };

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

describe('getMixItemsData', () => {
  const cases = [
    { category: 'daily' as const, path: '/userDailyMixes/{id}/relationships/items' },
    { category: 'discovery' as const, path: '/userDiscoveryMixes/{id}/relationships/items' },
    { category: 'new-release' as const, path: '/userNewReleaseMixes/{id}/relationships/items' },
    { category: 'offline' as const, path: '/userOfflineMixes/{id}/relationships/items' },
  ];

  for (const { category, path } of cases) {
    it(`uses ${path} for ${category}`, async () => {
      mockClient.GET.mockResolvedValue({
        data: {
          included: [{ id: 't-1', type: 'tracks', attributes: { title: 'Song' } }],
        },
      });

      const result = await getMixItemsData(category, 'mix-42', mockClient, 'US');

      expect(mockClient.GET).toHaveBeenCalledWith(path, expect.objectContaining({
        params: expect.objectContaining({ path: { id: 'mix-42' } }),
      }));
      expect(result).toEqual([{ id: 't-1', type: 'tracks', name: 'Song' }]);
    });
  }

  it('throws on API error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 404 } });
    await expect(getMixItemsData('daily', 'mix-x', mockClient, 'US')).rejects.toThrow(/Failed to get mix items/);
  });
});

describe('getMixItems (CLI wrapper)', () => {
  it('outputs JSON', async () => {
    mockClient.GET.mockResolvedValue({
      data: { included: [{ id: 't-1', type: 'tracks', attributes: { title: 'A' } }] },
    });

    await getMixItems('daily', 'mix-1', true);

    const parsed = JSON.parse(output.join(''));
    expect(parsed).toEqual([{ id: 't-1', type: 'tracks', name: 'A' }]);
  });

  it('exits on error', async () => {
    mockClient.GET.mockResolvedValue({ data: null, error: { status: 500 } });
    await expect(getMixItems('daily', 'mix-1', false)).rejects.toThrow('process.exit(1)');
  });
});
