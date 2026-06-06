import axios from 'axios';
import crypto from 'crypto';
import { AHTokens } from '../types.js';

const AH_TOKEN_URL = 'https://api.ah.nl/mobile-auth/v1/auth/token';
const AH_AUTH_URL = 'https://login.ah.nl/secure/oauth/authorize';
const AH_CLIENT_ID = 'appie-android';
const REDIRECT_URI = process.env.AH_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';

// Cached anonymous token
let anonymousToken: { token: string; expiresAt: number } | null = null;

export async function getAnonymousToken(): Promise<string> {
  if (anonymousToken && Date.now() < anonymousToken.expiresAt) {
    return anonymousToken.token;
  }

  const response = await axios.post<AHTokens>(
    'https://api.ah.nl/mobile-auth/v1/auth/token/anonymous',
    { clientId: AH_CLIENT_ID },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Appie/8.22.3',
        'X-Application': 'AHWEBSHOP',
      },
    }
  );

  const { access_token, expires_in } = response.data;
  anonymousToken = {
    token: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  };

  return access_token;
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizationUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: AH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<AHTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: AH_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const response = await axios.post<AHTokens>(AH_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

export async function refreshTokens(refreshToken: string): Promise<AHTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: AH_CLIENT_ID,
  });

  const response = await axios.post<AHTokens>(AH_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}
