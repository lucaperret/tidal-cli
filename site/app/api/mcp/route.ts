import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'mcp-handler';
import { registerTools } from '../../mcp-lib/tools';

const handler = createMcpHandler(
  (server: McpServer) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'tidal-cli',
      version: '1.1.2',
    },
  },
  {
    basePath: '/api/mcp',
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
