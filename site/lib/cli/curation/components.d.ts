import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare const LIBRARY_INSIGHTS_URI = "ui://tidal/library-insights";
export declare const PLAYLIST_PREVIEW_URI = "ui://tidal/playlist-preview";
export declare const RESOURCE_MIME = "text/html;profile=mcp-app";
export declare const LIBRARY_INSIGHTS_HTML: string;
export declare const PLAYLIST_PREVIEW_HTML: string;
/** Register the UI component resources. Harmless on non-ChatGPT clients (they never fetch them). */
export declare function registerCurationResources(server: McpServer): void;
