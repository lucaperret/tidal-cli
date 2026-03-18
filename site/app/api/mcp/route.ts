import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import { registerTools } from '../../mcp-lib/tools';
import { getAccessTokenUserId } from '../../mcp-lib/redis';
import { SITE_URL } from '../../mcp-lib/constants';

const mcpHandler = createMcpHandler(
  (server: McpServer) => {
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
  },
  {
    serverInfo: {
      name: 'tidal-cli',
      version: '1.1.2',
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

const handler = withMcpAuth(mcpHandler, verifyToken, {
  required: false,
  resourceUrl: SITE_URL,
});

export { handler as GET, handler as POST, handler as DELETE };
