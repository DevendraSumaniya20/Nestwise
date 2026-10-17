import type { RequestHandler, Response } from 'express';
import type { AuthService, PublicUser } from '../../../application/auth-service.ts';
import { AppError } from '../../../application/errors.ts';

export const bearerToken = (header: string | undefined): string | null =>
  header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;

export function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req.headers.authorization);
    const user = token ? await auth.authenticate(token) : null;
    if (!user) return next(new AppError('unauthorized', 'UNAUTHENTICATED', 'Please log in again.'));
    res.locals.user = user;
    next();
  };
}

export const currentUser = (res: Response): PublicUser => res.locals.user as PublicUser;
