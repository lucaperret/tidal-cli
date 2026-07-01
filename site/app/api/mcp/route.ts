import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import { registerTools, registerCurationTools } from '../../mcp-lib/tools';
import { getAccessTokenUserId } from '../../mcp-lib/redis';
import { SITE_URL } from '../../mcp-lib/constants';

// TIDAL_MCP_PROFILE selects the tool surface for this deployment (additive — existing tools
// are untouched):
//   'full' (default) → all existing low-level tools + prompts
//   'app'            → only the value-add curation tools (set this on the scoped OpenAI app deploy)
//   'all'            → both
const PROFILE = process.env.TIDAL_MCP_PROFILE ?? 'full';
const INCLUDE_LEGACY = PROFILE !== 'app';
const INCLUDE_CURATION = PROFILE === 'app' || PROFILE === 'all';

const mcpHandler = createMcpHandler(
  (server: McpServer) => {
    if (INCLUDE_LEGACY) {
      registerTools(server);

      server.prompt('search_artist', 'Search for an artist and show their top tracks', { artist: z.string().describe('Artist name') },
        ({ artist }) => ({
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Search for ${artist} on Tidal and show me their most popular tracks` } }],
        }),
      );

      server.prompt('create_playlist', 'Create a playlist from an album', { playlist_name: z.string().describe('Playlist name'), album: z.string().describe('Album or artist name') },
        ({ playlist_name, album }) => ({
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Create a playlist called "${playlist_name}" and add all tracks from ${album}` } }],
        }),
      );

      server.prompt('discover_similar', 'Discover similar artists', { artist: z.string().describe('Artist name') },
        ({ artist }) => ({
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Find artists similar to ${artist} on Tidal and show me the top tracks of the first result` } }],
        }),
      );
    }

    if (INCLUDE_CURATION) {
      registerCurationTools(server);
    }
  },
  {
    serverInfo: {
      name: 'tidal-cli',
      version: '1.2.4',
    },
  },
  {
    streamableHttpEndpoint: '/api/mcp',
    maxDuration: 60,
  },
);

const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const userId = await getAccessTokenUserId(bearerToken);
  if (!userId) return undefined;

  return {
    token: bearerToken,
    clientId: 'tidal-cli',
    scopes: [],
    extra: { userId },
  };
};

const baseHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceUrl: SITE_URL,
});

// Add CORS headers and expose WWW-Authenticate so cross-origin clients can
// read the OAuth challenge and start the auth flow.
const handler = async (req: Request): Promise<Response> => {
  const res = await baseHandler(req);
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');
  headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Session-Id');
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

const optionsHandler = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version',
      'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Session-Id',
      'Access-Control-Max-Age': '86400',
    },
  });

export {
  handler as GET,
  handler as POST,
  handler as DELETE,
  optionsHandler as OPTIONS,
};
