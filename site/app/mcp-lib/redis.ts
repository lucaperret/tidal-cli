import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

// OAuth session (temporary, during auth flow)
export interface OAuthSession {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  tidalCodeVerifier: string;
  tidalState: string;
}

export async function saveOAuthSession(sessionId: string, session: OAuthSession): Promise<void> {
  await getRedis().set(`session:${sessionId}`, JSON.stringify(session), { ex: 600 }); // 10 min TTL
}

export async function getOAuthSession(sessionId: string): Promise<OAuthSession | null> {
  const data = await getRedis().get<string>(`session:${sessionId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function deleteOAuthSession(sessionId: string): Promise<void> {
  await getRedis().del(`session:${sessionId}`);
}

// Auth code → user mapping (temporary)
export async function saveAuthCode(code: string, userId: string): Promise<void> {
  await getRedis().set(`auth_code:${code}`, userId, { ex: 300 }); // 5 min TTL
}

export async function getAuthCodeUserId(code: string): Promise<string | null> {
  return getRedis().get<string>(`auth_code:${code}`);
}

export async function deleteAuthCode(code: string): Promise<void> {
  await getRedis().del(`auth_code:${code}`);
}

// Tidal tokens per user (long-lived)
export interface TidalTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  countryCode?: string;
  userId?: string;
}

export async function saveTidalTokens(userId: string, tokens: TidalTokens): Promise<void> {
  await getRedis().set(`user:${userId}:tidal`, JSON.stringify(tokens), { ex: 2592000 }); // 30 days TTL
}

export async function getTidalTokens(userId: string): Promise<TidalTokens | null> {
  const data = await getRedis().get<string>(`user:${userId}:tidal`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// MCP access token → user mapping
export async function saveAccessToken(token: string, userId: string): Promise<void> {
  await getRedis().set(`mcp_token:${token}`, userId, { ex: 86400 }); // 24h TTL
}

export async function getAccessTokenUserId(token: string): Promise<string | null> {
  return getRedis().get<string>(`mcp_token:${token}`);
}

// MCP refresh token → user mapping
export async function saveRefreshToken(token: string, userId: string): Promise<void> {
  await getRedis().set(`refresh:${token}`, userId, { ex: 2592000 }); // 30 days TTL
}

export async function getRefreshTokenUserId(token: string): Promise<string | null> {
  return getRedis().get<string>(`refresh:${token}`);
}
