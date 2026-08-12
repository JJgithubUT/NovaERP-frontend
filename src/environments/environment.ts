import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: process.env['NG_APP_API_BASE_URL'] ?? 'http://127.0.0.1:8000',
  enableServiceWorker: process.env['NG_APP_ENABLE_SERVICE_WORKER'] === 'true',
  queryStaleTimeMs: Number(process.env['NG_APP_QUERY_STALE_TIME_MS']) || 30_000,
  queryGcTimeMs: Number(process.env['NG_APP_QUERY_GC_TIME_MS']) || 24 * 60 * 60 * 1000,
};
