import { vi, describe, it, expect } from 'vitest';

import { extractCursor, fetchAllPages } from '../pagination';

describe('extractCursor', () => {
  it('extracts page[cursor] from a full URL', () => {
    expect(
      extractCursor('https://openapi.tidal.com/v2/playlists?page%5Bcursor%5D=ABC123'),
    ).toBe('ABC123');
  });

  it('extracts page[cursor] from a path + query string', () => {
    expect(
      extractCursor('/playlists?filter%5Bowners.id%5D=me&page%5Bcursor%5D=ABC123'),
    ).toBe('ABC123');
  });

  it('extracts page[cursor] from a bare query string', () => {
    expect(extractCursor('page%5Bcursor%5D=ABC123')).toBe('ABC123');
  });

  it('returns undefined for undefined, null, and empty string', () => {
    expect(extractCursor(undefined)).toBeUndefined();
    expect(extractCursor(null)).toBeUndefined();
    expect(extractCursor('')).toBeUndefined();
  });

  it('returns undefined when next carries no page[cursor] param', () => {
    expect(extractCursor('/playlists?filter%5Bowners.id%5D=me')).toBeUndefined();
  });
});

describe('fetchAllPages', () => {
  const noDelay = { retryDelayMs: 0 };

  it('concatenates data across two pages and stops when links.next is absent', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'd1' }],
          links: { next: '/playlists?page%5Bcursor%5D=C2' },
        },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'd2' }], links: {} },
      });

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(client.GET).toHaveBeenCalledTimes(2);
    expect(data.map((d: any) => d.id)).toEqual(['d1', 'd2']);
  });

  it('concatenates included across pages', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'd1' }],
          included: [{ id: 'i1' }],
          links: { next: '/playlists?page%5Bcursor%5D=C2' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'd2' }],
          included: [{ id: 'i2' }],
          links: {},
        },
      });

    const { included } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(included.map((i: any) => i.id)).toEqual(['i1', 'i2']);
  });

  it('passes page[cursor] on the second request only', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'd1' }],
          links: { next: '/playlists?page%5Bcursor%5D=NEXT123' },
        },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'd2' }], links: {} },
      });

    await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(client.GET.mock.calls[0][1].params.query?.['page[cursor]']).toBeUndefined();
    expect(client.GET.mock.calls[1][1].params.query['page[cursor]']).toBe('NEXT123');
  });

  it('prefers links.meta.nextCursor over links.next', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'd1' }],
          links: {
            next: '/playlists?page%5Bcursor%5D=FROM_URL',
            meta: { nextCursor: 'FROM_META' },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'd2' }], links: {} },
      });

    await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(client.GET.mock.calls[1][1].params.query['page[cursor]']).toBe('FROM_META');
  });

  it('retries a transient empty page and recovers the real items', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({ data: { data: [], links: {} } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'real' }], links: {} } });

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(client.GET).toHaveBeenCalledTimes(2);
    expect(data.map((d: any) => d.id)).toEqual(['real']);
  });

  it('accepts a genuinely empty page as end-of-data after retries are exhausted', async () => {
    const client = { GET: vi.fn() };
    client.GET.mockResolvedValue({ data: { data: [], links: {} } });

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(data).toEqual([]);
    // retried up to the cap, then gave up — did not loop forever
    expect(client.GET).toHaveBeenCalledTimes(3);
  });

  it('throws when a page still returns an error after its retries', async () => {
    const client = { GET: vi.fn() };
    client.GET.mockResolvedValue({ data: null, error: { status: 503 } });

    await expect(fetchAllPages(client, '/playlists', {}, noDelay)).rejects.toThrow(
      /Failed to fetch \/playlists/,
    );
    expect(client.GET).toHaveBeenCalledTimes(3);
  });

  it('recovers when an error page succeeds on retry', async () => {
    const client = { GET: vi.fn() };
    client.GET
      .mockResolvedValueOnce({ data: null, error: { status: 500 } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'ok' }], links: {} } });

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(data.map((d: any) => d.id)).toEqual(['ok']);
  });

  it('stops at the safety cap instead of looping forever', async () => {
    const client = { GET: vi.fn() };
    let n = 0;
    client.GET.mockImplementation(async () => ({
      data: {
        data: [{ id: `d${n}` }],
        links: { next: `/playlists?page%5Bcursor%5D=C${n++}` },
      },
    }));

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    expect(client.GET).toHaveBeenCalledTimes(100);
    expect(data).toHaveLength(100);
  });

  it('stops when the server repeats a cursor it already returned', async () => {
    const client = { GET: vi.fn() };
    client.GET.mockResolvedValue({
      data: {
        data: [{ id: 'd' }],
        links: { next: '/playlists?page%5Bcursor%5D=SAME' },
      },
    });

    const { data } = await fetchAllPages(client, '/playlists', {}, noDelay);

    // page 0 (no cursor) + page 1 (cursor SAME), then SAME repeats -> stop
    expect(client.GET).toHaveBeenCalledTimes(2);
    expect(data).toHaveLength(2);
  });
});
