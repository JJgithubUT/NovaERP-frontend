import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  // Mismo origen: se asume un reverse proxy que enruta /api al backend Django.
  apiBaseUrl: '',
  enableServiceWorker: true,
  queryStaleTimeMs: 30_000,
  queryGcTimeMs: 24 * 60 * 60 * 1000,
};
