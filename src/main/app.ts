import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AuthService } from '../application/auth-service.ts';
import type { FlatService } from '../application/flat-service.ts';
import { errorHandler, notFoundHandler } from '../presentation/http/middleware/error-handler.ts';
import { requestId } from '../presentation/http/middleware/request-id.ts';
import { authRouter } from '../presentation/http/routes/auth.ts';
import { flatRouter } from '../presentation/http/routes/flats.ts';

export function createApp(services: { auth: AuthService; flats: FlatService }): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestId);
  // The mobile app is not a browser, so CORS only matters for web tools during development.
  app.use(cors());
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/v1', authRouter(services.auth));
  app.use('/api/v1', flatRouter(services.auth, services.flats));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
