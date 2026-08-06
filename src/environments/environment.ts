import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000',
  // En dev el SW estorba (rompe el HMR y sirve código viejo). Se activa a mano
  // desde la consola si se quiere probar el flujo offline.
  enableServiceWorker: false,
  queryStaleTimeMs: 30_000,
  queryGcTimeMs: 24 * 60 * 60 * 1000,
};
