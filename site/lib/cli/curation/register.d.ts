import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/** How a host acquires a Tidal client + country code for a tool call. `extra` is the MCP call context. */
export type CurationClientGetter = (extra: any) => Promise<{
    client: any;
    countryCode: string;
}>;
export declare function registerCurationTools(server: McpServer, getClient: CurationClientGetter): void;
