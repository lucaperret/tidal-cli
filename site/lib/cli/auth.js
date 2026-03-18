"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureInit = ensureInit;
exports.authenticate = authenticate;
exports.getApiClient = getApiClient;
exports.getCountryCode = getCountryCode;
exports.doLogout = doLogout;
const session_1 = require("./session");
// Must install localStorage polyfill before importing auth
(0, session_1.installLocalStorage)();
const auth_1 = require("@tidal-music/auth");
const api_1 = require("@tidal-music/api");
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
// Public client ID for the "Tidal CLI" application.
// This identifies the app, not a secret — standard OAuth public client pattern.
// Auth uses PKCE (code_challenge + code_verifier) instead of a client_secret.
const CLIENT_ID = 'PYVtmSHMTGI9oBUs';
const CREDENTIALS_STORAGE_KEY = 'tidal-cli';
const REDIRECT_PORT = 17893;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = [
    'collection.read',
    'collection.write',
    'playlists.read',
    'playlists.write',
    'playback',
    'user.read',
    'recommendations.read',
    'entitlements.read',
    'search.read',
    'search.write',
];
let initialized = false;
async function ensureInit() {
    if (initialized)
        return;
    await (0, auth_1.init)({
        clientId: CLIENT_ID,
        credentialsStorageKey: CREDENTIALS_STORAGE_KEY,
        scopes: SCOPES,
    });
    initialized = true;
}
function openBrowser(url) {
    const cmd = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
            : 'xdg-open';
    (0, child_process_1.exec)(`${cmd} "${url}"`);
}
async function authenticate() {
    await ensureInit();
    const loginUrl = await (0, auth_1.initializeLogin)({ redirectUri: REDIRECT_URI });
    // Wait for the OAuth callback on a local HTTP server
    const code = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);
            if (url.pathname !== '/callback') {
                res.writeHead(404);
                res.end();
                return;
            }
            const error = url.searchParams.get('error');
            if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Authorization failed</h1><p>You can close this tab.</p>');
                server.close();
                reject(new Error(`OAuth error: ${error} — ${url.searchParams.get('error_description') ?? ''}`));
                return;
            }
            const queryString = url.search.substring(1); // strip leading '?'
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>tidal-cli — Authorized</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #000; color: #fff; min-height: 100vh; display: flex; justify-content: center; padding: 60px 20px; }
  .container { max-width: 600px; width: 100%; }

  .hero { text-align: center; margin-bottom: 48px; }
  .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .logo svg { color: #00ffff; }
  .logo span { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  h1 { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
  h1 em { font-style: normal; color: #00ffff; }
  .status { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .status .dot { width: 6px; height: 6px; border-radius: 50%; background: #00ffff; }
  .status span { font-size: 13px; color: #00ffff; font-family: monospace; }
  .subtitle { color: #888; font-size: 15px; line-height: 1.5; }

  .section-label { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 1.5px; margin: 32px 0 12px; }

  .cmd { background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 14px 16px; margin-bottom: 6px; transition: border-color 0.2s; }
  .cmd:hover { border-color: rgba(0,255,255,0.2); }
  .cmd code { color: #fff; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; }
  .cmd code .prompt { color: rgba(0,255,255,0.5); user-select: none; }
  .cmd .desc { color: #666; font-size: 12px; margin-top: 4px; }

  .prompts { margin-top: 40px; padding-top: 32px; border-top: 1px solid #1a1a1a; }
  .prompts h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
  .prompts .sub { color: #888; font-size: 14px; margin-bottom: 16px; }
  .prompt-card { background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 14px 16px; margin-bottom: 6px; cursor: default; transition: border-color 0.2s; }
  .prompt-card:hover { border-color: rgba(0,255,255,0.2); }
  .prompt-card .label { font-size: 13px; color: #fff; margin-bottom: 2px; }
  .prompt-card .example { font-size: 12px; color: #555; font-style: italic; }

  .footer { margin-top: 40px; text-align: center; color: #333; font-size: 12px; }
  .footer a { color: #00ffff; text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
</style></head><body><div class="container">

  <div class="hero">
    <div class="logo">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none"><path d="M20 4L28 12L20 20L12 12L20 4Z" fill="currentColor"/><path d="M12 12L20 20L12 28L4 20L12 12Z" fill="currentColor" opacity="0.7"/><path d="M28 12L36 20L28 28L20 20L28 12Z" fill="currentColor" opacity="0.7"/><path d="M20 20L28 28L20 36L12 28L20 20Z" fill="currentColor" opacity="0.4"/></svg>
      <span>tidal-cli</span>
    </div>
    <h1>You're <em>in</em></h1>
    <div class="status"><div class="dot"></div><span>authenticated</span></div>
    <p class="subtitle">Your AI agent can now control Tidal. Try one of these prompts.</p>
  </div>

  <div class="section-label">Ask your AI agent</div>
    <div class="prompt-card"><div class="label">Create a playlist with the best tracks from Daft Punk's Discovery album</div><div class="example">Searches, creates playlist, adds tracks</div></div>
    <div class="prompt-card"><div class="label">Find artists similar to Massive Attack and add their top tracks to my library</div><div class="example">Searches catalog, adds to favorites</div></div>
    <div class="prompt-card"><div class="label">What are my playlists? Add the new LCD Soundsystem album to the first one</div><div class="example">Lists playlists, searches album, adds tracks</div></div>
    <div class="prompt-card"><div class="label">Play me something by Boards of Canada</div><div class="example">Searches, picks a track, plays it</div></div>
    <div class="prompt-card"><div class="label">Build a 2000s indie rock playlist with The Strokes, Arctic Monkeys, and Interpol</div><div class="example">Multi-step: create, search, add tracks</div></div>

  <div class="section-label">Or use the CLI directly</div>
  <div class="cmd"><code><span class="prompt">$ </span>tidal-cli search track "Around the World"</code><div class="desc">Search for tracks, artists, or albums</div></div>
  <div class="cmd"><code><span class="prompt">$ </span>tidal-cli playlist list</code><div class="desc">List your playlists</div></div>
  <div class="cmd"><code><span class="prompt">$ </span>tidal-cli playlist create --name "Chill Vibes"</code><div class="desc">Create a new playlist</div></div>
  <div class="cmd"><code><span class="prompt">$ </span>tidal-cli playback play 21844140</code><div class="desc">Play a track locally</div></div>

  <div class="footer">
    <a href="https://clawhub.ai/lucaperret/tidal-cli">ClawHub</a> &middot; <a href="https://github.com/lucaperret/tidal-cli">GitHub</a>
  </div>

</div></body></html>`);
            server.close();
            resolve(queryString);
        });
        server.listen(REDIRECT_PORT, () => {
            console.log('\nOpening browser for Tidal authorization...');
            console.log(`If the browser doesn't open, visit:\n  ${loginUrl}\n`);
            console.log('Waiting for authorization...');
            openBrowser(loginUrl);
        });
        server.on('error', (err) => {
            reject(new Error(`Failed to start callback server on port ${REDIRECT_PORT}: ${err.message}`));
        });
    });
    await (0, auth_1.finalizeLogin)(code);
    const creds = await auth_1.credentialsProvider.getCredentials();
    console.log(`\nAuthenticated successfully! User ID: ${creds.userId ?? 'unknown'}`);
}
async function getApiClient() {
    await ensureInit();
    // Verify we have valid credentials
    const creds = await auth_1.credentialsProvider.getCredentials();
    if (!creds.token) {
        console.error('Error: Not authenticated. Run `tidal-cli auth` first.');
        process.exit(1);
    }
    return (0, api_1.createAPIClient)(auth_1.credentialsProvider);
}
let cachedCountryCode = null;
async function getCountryCode() {
    if (cachedCountryCode)
        return cachedCountryCode;
    try {
        const client = await getApiClient();
        const { data } = await client.GET('/users/{id}', {
            params: { path: { id: 'me' } },
        });
        const country = data?.data?.attributes?.country;
        if (country) {
            cachedCountryCode = country;
            return country;
        }
    }
    catch {
        // fall through to default
    }
    cachedCountryCode = process.env.TIDAL_COUNTRY ?? 'US';
    return cachedCountryCode;
}
async function doLogout() {
    await ensureInit();
    (0, auth_1.logout)();
    console.log('Logged out successfully.');
}
//# sourceMappingURL=auth.js.map