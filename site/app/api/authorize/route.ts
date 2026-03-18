import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_REDIRECT_URIS } from '../../mcp-lib/constants';
import { saveOAuthSession } from '../../mcp-lib/redis';
import { generatePKCE, generateId, buildTidalAuthorizationUrl } from '../../mcp-lib/tidal-oauth';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const redirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method') || 'S256';

  if (!redirectUri || !state || !codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters: redirect_uri, state, code_challenge' },
      { status: 400 },
    );
  }

  // Validate redirect_uri against allowlist
  const isAllowed = ALLOWED_REDIRECT_URIS.some(
    (allowed) => redirectUri === allowed || redirectUri.startsWith(allowed),
  );
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not allowed' },
      { status: 400 },
    );
  }

  // Generate PKCE for upstream Tidal OAuth
  const tidalPKCE = generatePKCE();
  const sessionId = generateId();

  // Store session in Redis
  await saveOAuthSession(sessionId, {
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
    tidalCodeVerifier: tidalPKCE.codeVerifier,
    tidalState: sessionId,
  });

  // Redirect user to Tidal login
  const tidalUrl = buildTidalAuthorizationUrl(tidalPKCE.codeChallenge, sessionId);
  return NextResponse.redirect(tidalUrl);
}
