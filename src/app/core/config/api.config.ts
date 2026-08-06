import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Origen del backend. Se inyecta en vez de importar `environment` directo para
 * que los tests puedan sobreescribirlo sin tocar el bundle de entorno.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
