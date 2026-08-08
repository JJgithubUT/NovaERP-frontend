import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

/**
 * Endpoints que no llevan (ni deben llevar) token: cuando se llaman todavía no
 * existe sesión. `activar/` entra aquí por lo mismo — la autoriza el token de
 * un solo uso, no un JWT—, y además evita mandar la credencial de quien tuviera
 * una sesión abierta en este navegador a una operación que no es suya.
 */
const RUTAS_PUBLICAS = ['/api/auth/login/', '/api/auth/otp/', '/api/auth/activar/'];

/**
 * Inyecta `Authorization: Bearer <JWT>` en toda petición saliente al backend.
 *
 * Deja pasar sin tocar las peticiones a otros orígenes: si la app pide un asset
 * a un CDN, mandarle el token del tenant sería una fuga de credenciales.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const token = store.token();

  if (!token || esRutaPublica(req.url) || !esApiPropia(req.url)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

function esRutaPublica(url: string): boolean {
  return RUTAS_PUBLICAS.some((ruta) => url.includes(ruta));
}

/**
 * Relativa (mismo origen) o absoluta contra nuestro backend. `URL` con base
 * resuelve ambos casos sin parsear a mano.
 */
function esApiPropia(url: string): boolean {
  try {
    const target = new URL(url, window.location.origin);
    return target.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}
