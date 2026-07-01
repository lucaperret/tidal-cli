// Integration test: drive analyze_library through the real MCP protocol (in-memory transport).
// Proves the tool registers correctly AND that the SDK forwards `structuredContent` + `_meta`
// at runtime — the cross-client contract the value-add layer depends on.

import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { registerCurationTools } from '../curation/register';
import { LIBRARY_INSIGHTS_URI, PLAYLIST_PREVIEW_URI, RESOURCE_MIME } from '../curation/components';

// Minimal stub Tidal client: one playlist with a duplicate-able track + a saved gem.
function stubClient() {
  return {
    GET: async (path: string, opts: any) => {
      if (path === '/playlists') {
        return {
          data: {
            data: [
              { id: 'pl-1', attributes: { name: 'Chill', numberOfItems: 1, lastModifiedAt: '2026-06-10T00:00:00Z' } },
            ],
          },
        };
      }
      if (path === '/userCollectionSaveForLaters/{id}/relationships/items') {
        return {
          data: {
            included: [
              { id: 't-gem', type: 'tracks', attributes: { title: 'Hidden Gem' } },
              { id: 'art-1', type: 'artists', attributes: { name: 'Burial' } },
            ],
          },
        };
      }
      if (path === '/playlists/{id}/relationships/items') {
        return {
          data: {
            data: [{ id: 't-x', type: 'tracks', meta: { itemId: 'i1' } }],
            included: [{ id: 't-x', type: 'tracks', attributes: { title: 'In Playlist' } }],
            links: {},
          },
        };
      }
      // favorited playlists, recently added → empty
      return { data: { included: [], data: [] } };
    },
  };
}

async function connectPair() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = new McpServer({ name: 'tidal-test', version: '0.0.0' });
  registerCurationTools(server, async () => ({ client: stubClient(), countryCode: 'US' }));
  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, server };
}

describe('analyze_library over MCP', () => {
  it('registers exactly the 4 value-add tools with correct annotations', async () => {
    const { client } = await connectPair();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['analyze_library', 'create_playlist', 'curate_playlist', 'playlist_from_text']);

    const curate = tools.find((t) => t.name === 'curate_playlist')!;
    expect(curate.annotations?.readOnlyHint).toBe(true);
    const create = tools.find((t) => t.name === 'create_playlist')!;
    expect(create.annotations?.readOnlyHint).toBe(false);
    expect(create.annotations?.destructiveHint).toBe(false);
  });

  it('is listed with read-only annotations', async () => {
    const { client } = await connectPair();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('analyze_library');
    const tool = tools.find((t) => t.name === 'analyze_library')!;
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.destructiveHint).toBe(false);
  });

  it('returns clean text content + structuredContent through the protocol', async () => {
    const { client } = await connectPair();
    const res: any = await client.callTool({ name: 'analyze_library', arguments: { deep: true } });

    // Text channel (Claude / any client) — clean, no raw IDs / ISO timestamps.
    const text = res.content[0].text as string;
    expect(text).toContain('Library overview');
    expect(text.toLowerCase()).toContain('forgotten gem');
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).not.toMatch(/\bt-gem\b/);

    // Structured channel (model + ChatGPT component) survives the round-trip.
    expect(res.structuredContent).toBeDefined();
    expect(res.structuredContent.totals.ownedPlaylists).toBe(1);
    expect(res.structuredContent.forgottenGems.count).toBe(1);
    expect(res.structuredContent.forgottenGems.items[0].trackId).toBe('t-gem');

    // ChatGPT-only enhancement: the result carries the widget template via _meta (Claude ignores it).
    expect(res._meta?.['openai/outputTemplate']).toBe(LIBRARY_INSIGHTS_URI);
  });
});

describe('UI component resources over MCP', () => {
  it('lists both widget resources', async () => {
    const { client } = await connectPair();
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(LIBRARY_INSIGHTS_URI);
    expect(uris).toContain(PLAYLIST_PREVIEW_URI);
  });

  it('serves the playlist-preview widget HTML with the Apps SDK mime type and Save wiring', async () => {
    const { client } = await connectPair();
    const res: any = await client.readResource({ uri: PLAYLIST_PREVIEW_URI });
    const c = res.contents[0];
    expect(c.mimeType).toBe(RESOURCE_MIME);
    expect(c.text).toContain('window.openai');
    expect(c.text).toContain("callTool('create_playlist'");
    expect(c.text).toContain('<!doctype html>');
  });

  it('serves the library-insights widget HTML', async () => {
    const { client } = await connectPair();
    const res: any = await client.readResource({ uri: LIBRARY_INSIGHTS_URI });
    expect(res.contents[0].mimeType).toBe(RESOURCE_MIME);
    expect(res.contents[0].text).toContain('toolOutput');
  });
});

// Richer stub for the curate/create flow.
function curationStubClient(state: { created?: any; addedBatches?: any[] }) {
  state.addedBatches = state.addedBatches ?? [];
  return {
    GET: async (path: string, opts: any) => {
      if (path === '/searchResults/{id}') {
        const q = opts?.params?.path?.id as string;
        // Two candidates: one lossless, one lossy.
        const included = [
          { id: 'art-1', type: 'artists', attributes: { name: 'Daft Punk' } },
          {
            id: 'flac', type: 'tracks',
            attributes: { title: q.includes('Lucky') ? 'Get Lucky' : 'Doheny', isrc: 'X1', popularity: 0.8, mediaTags: ['LOSSLESS'] },
            relationships: { artists: { data: [{ id: 'art-1', type: 'artists' }] } },
          },
          {
            id: 'lossy', type: 'tracks',
            attributes: { title: q.includes('Lucky') ? 'Get Lucky' : 'Doheny', isrc: 'X2', popularity: 0.9, mediaTags: [] },
            relationships: { artists: { data: [{ id: 'art-1', type: 'artists' }] } },
          },
        ];
        return { data: { included } };
      }
      return { data: { included: [], data: [] } };
    },
    POST: async (path: string, opts: any) => {
      if (path === '/playlists') {
        state.created = { id: 'new-pl', attributes: { name: opts.body.data.attributes.name } };
        return { data: { data: state.created } };
      }
      if (path === '/playlists/{id}/relationships/items') {
        state.addedBatches!.push(opts.body.data);
        return { error: undefined };
      }
      return { error: undefined };
    },
  };
}

async function connectWith(stub: any) {
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const server = new McpServer({ name: 'tidal-test', version: '0.0.0' });
  registerCurationTools(server, async () => ({ client: stub, countryCode: 'US' }));
  await server.connect(st);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(ct);
  return client;
}

describe('curate_playlist + create_playlist over MCP', () => {
  it('audiophile preview keeps only lossless tracks and exposes trackIds (no save)', async () => {
    const state: any = {};
    const client = await connectWith(curationStubClient(state));
    const res: any = await client.callTool({
      name: 'curate_playlist',
      arguments: { mode: 'audiophile', name: 'DAC Demo', items: [{ artist: 'Daft Punk', title: 'Get Lucky' }] },
    });

    expect(res.structuredContent.kind).toBe('preview');
    expect(res.structuredContent.tracks).toHaveLength(1);
    expect(res.structuredContent.tracks[0].trackId).toBe('flac');
    expect(res.structuredContent.tracks[0].quality).toBe('LOSSLESS');
    expect(res.structuredContent.trackIds).toEqual(['flac']);
    expect(res._meta?.['openai/outputTemplate']).toBe(PLAYLIST_PREVIEW_URI);
    // Read-only preview: no playlist created.
    expect(state.created).toBeUndefined();
    // Summary is clean (no raw track IDs).
    expect(res.content[0].text).not.toMatch(/\bflac\b/);
    expect(res.content[0].text).toContain('lossless-only');
  });

  it('create_playlist commits a confirmed preview (batched add)', async () => {
    const state: any = {};
    const client = await connectWith(curationStubClient(state));
    const res: any = await client.callTool({
      name: 'create_playlist',
      arguments: { name: 'DAC Demo', trackIds: ['flac', 'flac2'] },
    });

    expect(res.structuredContent.kind).toBe('created');
    expect(res.structuredContent.playlistId).toBe('new-pl');
    expect(res.structuredContent.trackCount).toBe(2);
    expect(res.structuredContent.url).toContain('new-pl');
    expect(state.created.attributes.name).toBe('DAC Demo');
    expect(state.addedBatches[0]).toEqual([
      { id: 'flac', type: 'tracks' },
      { id: 'flac2', type: 'tracks' },
    ]);
    // Clean summary: no raw playlist ID in the text.
    expect(res.content[0].text).not.toContain('new-pl');
  });

  it('reports partial success (added N of M) without throwing when a batch fails', async () => {
    let itemCalls = 0;
    const stub = {
      GET: async () => ({ data: { included: [], data: [] } }),
      POST: async (path: string, opts: any) => {
        if (path === '/playlists') return { data: { data: { id: 'pl', attributes: { name: opts.body.data.attributes.name } } } };
        if (path === '/playlists/{id}/relationships/items') {
          itemCalls++;
          return itemCalls === 1 ? { error: undefined } : { error: { status: 500 } };
        }
        return { error: undefined };
      },
    };
    const client = await connectWith(stub);
    const ids = Array.from({ length: 25 }, (_, i) => `t${i}`); // 2 chunks: 20 + 5
    const res: any = await client.callTool({ name: 'create_playlist', arguments: { name: 'X', trackIds: ids } });

    expect(res.structuredContent.complete).toBe(false);
    expect(res.structuredContent.trackCount).toBe(20); // first chunk succeeded, second failed
    expect(res.structuredContent.requested).toBe(25);
    expect(res.content[0].text).toContain('20 of 25');
    expect(res.content[0].text).not.toContain('500'); // no raw error internals leaked
  });

  it('sanitizes whitespace-only track ids', async () => {
    const state: any = {};
    const client = await connectWith(curationStubClient(state));
    const res: any = await client.callTool({ name: 'create_playlist', arguments: { name: 'X', trackIds: ['  ', 'good'] } });
    expect(res.structuredContent.trackCount).toBe(1);
    expect(state.addedBatches[0]).toEqual([{ id: 'good', type: 'tracks' }]);
  });
});
