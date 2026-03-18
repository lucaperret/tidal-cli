// Shared constants from the CLI auth module
export const TIDAL_CLIENT_ID = 'PYVtmSHMTGI9oBUs';

export const TIDAL_SCOPES = [
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

export const TIDAL_AUTH_URL = 'https://login.tidal.com/authorize';
export const TIDAL_TOKEN_URL = 'https://auth.tidal.com/v1/oauth2/token';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tidal-cli.lucaperret.ch';

// Claude MCP callback URLs to allowlist
export const ALLOWED_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
  'http://localhost:6274/oauth/callback',
  'http://localhost:6274/oauth/callback/debug',
];
