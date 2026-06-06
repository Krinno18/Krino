import { Router, Request, Response } from 'express';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePKCE,
  refreshTokens,
} from '../services/ahAuth.js';

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  req.session.pkceVerifier = codeVerifier;

  const authUrl = buildAuthorizationUrl(codeChallenge);
  res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    res.redirect(`${process.env.CLIENT_URL ?? 'http://localhost:5173'}/login?error=auth_failed`);
    return;
  }

  const codeVerifier = req.session.pkceVerifier;
  if (!codeVerifier) {
    res.redirect(`${process.env.CLIENT_URL ?? 'http://localhost:5173'}/login?error=invalid_state`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code as string, codeVerifier);
    req.session.ahTokens = tokens;
    delete req.session.pkceVerifier;
    res.redirect(process.env.CLIENT_URL ?? 'http://localhost:5173');
  } catch {
    res.redirect(`${process.env.CLIENT_URL ?? 'http://localhost:5173'}/login?error=token_failed`);
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  if (!req.session.ahTokens?.refresh_token) {
    res.status(401).json({ error: 'Geen refresh token' });
    return;
  }

  try {
    const tokens = await refreshTokens(req.session.ahTokens.refresh_token);
    req.session.ahTokens = tokens;
    res.json({ success: true });
  } catch {
    req.session.ahTokens = undefined;
    res.status(401).json({ error: 'Token vernieuwen mislukt' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.ahTokens = undefined;
  res.json({ success: true });
});

router.get('/status', (req: Request, res: Response) => {
  res.json({ loggedIn: !!req.session.ahTokens });
});

export default router;
