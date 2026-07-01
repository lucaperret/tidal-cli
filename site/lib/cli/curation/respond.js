"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.appResponse = appResponse;
/**
 * Build a tool result that works on both Claude and ChatGPT.
 * Both `structuredContent` and `_meta` are passed through unchanged by the MCP SDK
 * (verified on @modelcontextprotocol/sdk 1.26/1.29) and by mcp-handler.
 */
function appResponse(opts) {
    const meta = { ...(opts.meta ?? {}) };
    if (opts.component) {
        // ChatGPT Apps SDK key. Claude ignores unknown `_meta` keys → graceful fallback.
        meta['openai/outputTemplate'] = opts.component;
    }
    const result = {
        content: [{ type: 'text', text: opts.summary }],
        structuredContent: opts.data,
    };
    if (Object.keys(meta).length > 0) {
        result._meta = meta;
    }
    return result;
}
//# sourceMappingURL=respond.js.map