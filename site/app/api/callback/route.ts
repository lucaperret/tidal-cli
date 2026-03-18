import { NextRequest, NextResponse } from 'next/server';
import { getOAuthSession, deleteOAuthSession, saveTidalTokens, saveAuthCode } from '../../mcp-lib/redis';
import { exchangeTidalCode, generateId } from '../../mcp-lib/tidal-oauth';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state'); // This is our sessionId
  const error = params.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'access_denied', error_description: params.get('error_description') || 'User denied access' },
      { status: 403 },
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing code or state' },
      { status: 400 },
    );
  }

  // Look up the OAuth session
  const session = await getOAuthSession(state);
  if (!session) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Session expired or invalid' },
      { status: 400 },
    );
  }

  // Exchange authorization code for Tidal tokens
  let tokenResponse;
  try {
    tokenResponse = await exchangeTidalCode(code, session.tidalCodeVerifier);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'server_error', error_description: err.message },
      { status: 500 },
    );
  }

  // Store Tidal tokens in Redis
  const userId = generateId();
  await saveTidalTokens(userId, {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    countryCode: tokenResponse.user?.countryCode,
    userId: tokenResponse.user?.userId,
  });

  // Generate our own authorization code for the MCP client
  const mcpAuthCode = generateId();
  await saveAuthCode(mcpAuthCode, userId);

  // Clean up the session
  await deleteOAuthSession(state);

  // Redirect back to the MCP client with our authorization code
  const redirectUrl = new URL(session.redirectUri);
  redirectUrl.searchParams.set('code', mcpAuthCode);
  redirectUrl.searchParams.set('state', session.state);

  return NextResponse.redirect(redirectUrl.toString());
}
