import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthService } from '../../../application/auth-service.ts';
import { bearerToken, currentUser, requireAuth } from '../middleware/auth.ts';
import { forgotBody, loginBody, refreshBody, registerBody, resetBody } from '../schemas/index.ts';

export function authRouter(auth: AuthService): Router {
  const r = Router();
  // Slows password guessing and reset-code brute force per IP.
  const limited = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in a few minutes.' } },
  });

  // Refresh runs in the background during normal use, so it gets its own, looser budget.
  const refreshLimited = rateLimit({
    windowMs: 15 * 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in a few minutes.' } },
  });

  r.post('/auth/register', limited, async (req, res) => {
    res.status(201).json(await auth.register(registerBody.parse(req.body)));
  });
  r.post('/auth/login', limited, async (req, res) => {
    res.json(await auth.login(loginBody.parse(req.body)));
  });
  r.post('/auth/refresh', refreshLimited, async (req, res) => {
    res.json(await auth.refresh(refreshBody.parse(req.body).refreshToken));
  });
  r.post('/auth/forgot-password', limited, async (req, res) => {
    await auth.forgotPassword(forgotBody.parse(req.body).email);
    res.json({ message: 'If that email has an account, a reset code is on its way.' });
  });
  r.post('/auth/reset-password', limited, async (req, res) => {
    res.json(await auth.resetPassword(resetBody.parse(req.body)));
  });
  r.post('/auth/logout', requireAuth(auth), async (req, res) => {
    await auth.logout(bearerToken(req.headers.authorization)!);
    res.status(204).end();
  });
  r.get('/me', requireAuth(auth), (_req, res) => {
    res.json({ user: currentUser(res) });
  });
  return r;
}
