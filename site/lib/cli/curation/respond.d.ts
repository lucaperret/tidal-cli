export interface AppResponseOptions {
    /** Clean, human-readable text. No raw IDs or timestamps. Read by every MCP client. */
    summary: string;
    /** Structured payload. May carry IDs the component needs. Read by the model + component. */
    data: Record<string, unknown>;
    /** ChatGPT-only UI template URI, e.g. "ui://tidal/library-insights". Ignored by Claude. */
    component?: string;
    /** Extra `_meta` passthrough (component-only data). Merged with the component key. */
    meta?: Record<string, unknown>;
}
export interface AppResponseResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    structuredContent: Record<string, unknown>;
    _meta?: Record<string, unknown>;
    [key: string]: unknown;
}
/**
 * Build a tool result that works on both Claude and ChatGPT.
 * Both `structuredContent` and `_meta` are passed through unchanged by the MCP SDK
 * (verified on @modelcontextprotocol/sdk 1.26/1.29) and by mcp-handler.
 */
export declare function appResponse(opts: AppResponseOptions): AppResponseResult;
