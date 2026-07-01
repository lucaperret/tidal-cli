// Cross-client MCP tool-response helper for the value-add ("curation") layer.
//
// One tool result, two clients:
//  - Claude (and any MCP client): reads `content` (clean human text) + `structuredContent`.
//    It ignores `_meta`, so the conversation flow is normal text.
//  - ChatGPT Apps: also renders the UI component referenced by `_meta["openai/outputTemplate"]`,
//    feeding it `structuredContent` as `window.openai.toolOutput`.
//
// Rule of thumb: keep raw IDs / timestamps / diagnostic fields in `structuredContent` only.
// The `summary` text the model sees stays clean (no IDs, no ISO timestamps).

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
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  // Index signature so the result is structurally assignable to the MCP SDK's CallToolResult
  // (which declares `[x: string]: unknown`), without coupling this helper to the SDK types.
  [key: string]: unknown;
}

/**
 * Build a tool result that works on both Claude and ChatGPT.
 * Both `structuredContent` and `_meta` are passed through unchanged by the MCP SDK
 * (verified on @modelcontextprotocol/sdk 1.26/1.29) and by mcp-handler.
 */
export function appResponse(opts: AppResponseOptions): AppResponseResult {
  const meta: Record<string, unknown> = { ...(opts.meta ?? {}) };
  if (opts.component) {
    // ChatGPT Apps SDK key. Claude ignores unknown `_meta` keys → graceful fallback.
    meta['openai/outputTemplate'] = opts.component;
  }

  const result: AppResponseResult = {
    content: [{ type: 'text', text: opts.summary }],
    structuredContent: opts.data,
  };

  if (Object.keys(meta).length > 0) {
    result._meta = meta;
  }

  return result;
}
