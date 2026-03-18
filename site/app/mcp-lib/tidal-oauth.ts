import crypto from 'crypto';
import { TIDAL_CLIENT_ID, TIDAL_SCOPES, TIDAL_AUTH_URL, TIDAL_TOKEN_URL, SITE_URL } from './constants';

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildTidalAuthorizationUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: TIDAL_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${SITE_URL}/api/callback`,
    scope: TIDAL_SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${TIDAL_AUTH_URL}?${params.toString()}`;
}

export interface TidalTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user?: { userId?: string; countryCode?: string };
}

export async function exchangeTidalCode(code: string, codeVerifier: string): Promise<TidalTokenResponse> {
  const res = await fetch(TIDAL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TIDAL_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${SITE_URL}/api/callback`,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tidal token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function refreshTidalToken(refreshToken: string): Promise<TidalTokenResponse> {
  const res = await fetch(TIDAL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TIDAL_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tidal token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}
