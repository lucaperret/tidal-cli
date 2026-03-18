export declare function loadStorage(): Record<string, string>;
export declare function saveStorage(data: Record<string, string>): void;
/**
 * Install a globalThis.localStorage polyfill backed by ~/.tidal-cli/session.json.
 * Must be called before importing @tidal-music/auth.
 */
export declare function installLocalStorage(): void;
