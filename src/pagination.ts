// Cursor-based pagination for the Tidal v2 JSON:API.
//
// List responses return one page (~20 items) plus a `links.next` value carrying a
// `page[cursor]` token for the following page. The API also intermittently returns
// an HTTP 200 with an empty `data` array — a transient glitch that must be retried,
// otherwise a single bad response silently truncates the result.

const MAX_PAGES = 100; // safety cap against a server that never stops returning `next`
const MAX_ATTEMPTS = 3; // per-page attempts for transient empty/error responses
const RETRY_DELAY_MS = 250;

/** Pull the `page[cursor]` token out of a JSON:API `links.next` value. */
export function extractCursor(next: unknown): string | undefined {
  if (typeof next !== 'string' || next.length === 0) return undefined;
  const queryStart = next.indexOf('?');
  const queryString = queryStart >= 0 ? next.slice(queryStart + 1) : next;
  const cursor = new URLSearchParams(queryString).get('page[cursor]');
  return cursor ?? undefined;
}

interface PageParams {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

interface PaginationOptions {
  /** Delay between per-page retries. Overridable (set to 0) to keep tests fast. */
  retryDelayMs?: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface PageResult {
  data: any[];
  included: any[];
  cursor: string | undefined;
}

/**
 * GET a single page, retrying transient failures (an `{ error }` response or an
 * HTTP 200 with an empty `data` array). Throws once every attempt has errored;
 * returns the (possibly empty) page once retries are exhausted without an error —
 * an empty page is then treated as genuine end-of-data.
 */
async function fetchPage(
  client: any,
  path: string,
  requestParams: Record<string, unknown>,
  retryDelayMs: number,
): Promise<PageResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await client.GET(path, { params: requestParams });

    if (!error && data) {
      const pageData = (data as any).data ?? [];
      // A non-empty page is always real. An empty page may be a transient glitch,
      // so accept it only once retries are spent.
      if (pageData.length > 0 || attempt === MAX_ATTEMPTS) {
        const links = (data as any).links;
        return {
          data: pageData,
          included: (data as any).included ?? [],
          cursor: links?.meta?.nextCursor ?? extractCursor(links?.next),
        };
      }
      lastError = undefined;
    } else {
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) await sleep(retryDelayMs);
  }

  throw new Error(`Failed to fetch ${path} — ${JSON.stringify(lastError)}`);
}

/**
 * Repeatedly GET `path`, following `links.next`, until no further page.
 * Returns the concatenated `data` and `included` arrays from every page.
 */
export async function fetchAllPages(
  client: any,
  path: string,
  params: PageParams,
  options: PaginationOptions = {},
): Promise<{ data: any[]; included: any[] }> {
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const allData: any[] = [];
  const allIncluded: any[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const query: Record<string, unknown> = { ...(params.query ?? {}) };
    if (cursor) query['page[cursor]'] = cursor;

    const requestParams: Record<string, unknown> = {};
    if (params.path) requestParams.path = params.path;
    if (Object.keys(query).length > 0) requestParams.query = query;

    const result = await fetchPage(client, path, requestParams, retryDelayMs);
    allData.push(...result.data);
    allIncluded.push(...result.included);

    cursor = result.cursor;
    // Stop on no next page, or if the server hands back a cursor already used.
    if (!cursor || seenCursors.has(cursor)) break;
    seenCursors.add(cursor);
  }

  return { data: allData, included: allIncluded };
}
