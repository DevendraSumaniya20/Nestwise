import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, type AppErrorKind } from '../../../application/errors.ts';

const statusByKind: Record<AppErrorKind, number> = {
  invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  too_many: 429,
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are missing or invalid.',
        details: err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(statusByKind[err.kind]).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Malformed JSON bodies surface from express.json() with a 4xx status.
  if (typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number' && err.status < 500) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'The request body could not be read.' } });
    return;
  }
  console.error(`[${res.locals.requestId}] ${req.method} ${req.path}`, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      details: { requestId: res.locals.requestId },
    },
  });
};
