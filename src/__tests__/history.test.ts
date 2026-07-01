import { vi, describe, it, expect } from 'vitest';

import { getRecentlyAddedData } from '../history';

function makeClient(pages: any[]) {
  const GET = vi.fn(async (_path: string, opts: any) => {
    const cursor = opts?.params?.query?.['page[cursor]'];
    const idx = cursor ? Number(cursor) : 0;
    return { data: pages[idx] };
  });
  return { GET };
}

describe('getRecentlyAddedData — pagination (issue #1: show ALL followed artists)', () => {
  it('follows cursor pagination and returns the full collection, not just the first page', async () => {
    const client = makeClient([
      {
        data: [{ id: 'ar-1', type: 'artists', meta: { addedAt: '2026-01-01' } }],
        included: [{ id: 'ar-1', type: 'artists', attributes: { name: 'Artist One' } }],
        links: { next: '/userCollectionArtists/me/relationships/items?page%5Bcursor%5D=1' },
      },
      {
        data: [{ id: 'ar-2', type: 'artists', meta: { addedAt: '2026-01-02' } }],
        included: [{ id: 'ar-2', type: 'artists', attributes: { name: 'Artist Two' } }],
        links: {}, // no next -> stop
      },
    ]);

    const items = await getRecentlyAddedData('artists', client, 'US');

    // Both pages surfaced (pre-fix this returned only page 1 / ~20 artists).
    expect(items.map((i) => i.name)).toEqual(['Artist One', 'Artist Two']);
    expect(client.GET).toHaveBeenCalledTimes(2);
    expect(client.GET.mock.calls[1][1].params.query['page[cursor]']).toBe('1');
    // addedAt still enriched from relationship meta.
    expect(items[0].addedAt).toBe('2026-01-01');
  });

  it('uses the correct collection endpoint per type', async () => {
    const client = makeClient([{ data: [{ id: 'x', type: 'artists' }], included: [{ id: 'x', type: 'artists', attributes: { name: 'X' } }], links: {} }]);
    await getRecentlyAddedData('artists', client, 'US');
    expect(client.GET.mock.calls[0][0]).toBe('/userCollectionArtists/{id}/relationships/items');
  });
});
