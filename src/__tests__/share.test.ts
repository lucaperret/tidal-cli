import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../auth', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../auth';
import { createShareData, createShare } from '../share';

const mockClient = { POST: vi.fn() };

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

describe('createShareData', () => {
  it('POSTs to /shares with sharedResources relationship', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: {
          id: 's-1',
          type: 'shares',
          attributes: {
            code: 'abc123',
            createdAt: '2026-05-04T12:00:00Z',
            externalLinks: [{ href: 'https://tidal.com/share/abc123' }],
          },
        },
      },
    });

    const result = await createShareData('albums', 'alb-99', mockClient);

    expect(mockClient.POST).toHaveBeenCalledWith('/shares', {
      body: {
        data: {
          type: 'shares',
          relationships: {
            sharedResources: {
              data: [{ id: 'alb-99', type: 'albums' }],
            },
          },
        },
      },
    });
    expect(result).toEqual({
      id: 's-1',
      code: 'abc123',
      createdAt: '2026-05-04T12:00:00Z',
      url: 'https://tidal.com/share/abc123',
    });
  });

  it('falls back to first external link when no tidal.com link', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: {
          id: 's-2',
          attributes: {
            code: 'xyz',
            externalLinks: [{ href: 'https://example.com/x' }],
          },
        },
      },
    });

    const result = await createShareData('tracks', 't-1', mockClient);
    expect(result.url).toBe('https://example.com/x');
  });

  it('throws on error', async () => {
    mockClient.POST.mockResolvedValue({ data: null, error: { status: 400 } });
    await expect(createShareData('tracks', 't-1', mockClient)).rejects.toThrow(/Failed to create share/);
  });
});

describe('createShare CLI', () => {
  it('prints share details', async () => {
    mockClient.POST.mockResolvedValue({
      data: {
        data: {
          id: 's-1',
          attributes: {
            code: 'abc',
            externalLinks: [{ href: 'https://tidal.com/share/abc' }],
          },
        },
      },
    });

    await createShare('albums', 'alb-1', false);

    expect(output.some((l) => l.includes('Code: abc'))).toBe(true);
    expect(output.some((l) => l.includes('https://tidal.com/share/abc'))).toBe(true);
  });

  it('JSON output', async () => {
    mockClient.POST.mockResolvedValue({
      data: { data: { id: 's-1', attributes: { code: 'k' } } },
    });

    await createShare('tracks', 't-1', true);
    const parsed = JSON.parse(output.join(''));
    expect(parsed.code).toBe('k');
  });
});
