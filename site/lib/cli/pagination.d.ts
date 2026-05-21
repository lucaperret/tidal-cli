/** Pull the `page[cursor]` token out of a JSON:API `links.next` value. */
export declare function extractCursor(next: unknown): string | undefined;
interface PageParams {
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
}
interface PaginationOptions {
    /** Delay between per-page retries. Overridable (set to 0) to keep tests fast. */
    retryDelayMs?: number;
}
/**
 * Repeatedly GET `path`, following `links.next`, until no further page.
 * Returns the concatenated `data` and `included` arrays from every page.
 */
export declare function fetchAllPages(client: any, path: string, params: PageParams, options?: PaginationOptions): Promise<{
    data: any[];
    included: any[];
}>;
export {};
