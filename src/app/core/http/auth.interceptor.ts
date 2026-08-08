import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

/**
 * Endpoints que no llevan (ni deben llevar) token: cuando se llaman todavía no
 * existe sesión. `activar/` entra aquí por lo mismo — la autoriza el token de
 * un solo uso, no un JWT—, y además evita mandar la credencial de quien tuviera
 * una sesión abierta en este navegador a una operación que no es suya.
 */
const RUTAS_PUBLICAS = [
  '/api/auth/login/',
  '/api/auth/otp/',
  '/api/auth/activar/',
  // Canje del enlace de alta de una organización: lo autoriza el token de un
  // solo uso, y quien lo usa todavía no puede autenticarse.
  '/api/auth/activar-tenant/',
];

/**
 * Prefijo de la superficie de plataforma. El token de tenant **no** vale ahí
 * —el backend responde 401— y mandarlo sería filtrar la credencial de un tenant
 * a un endpoint que no es suyo. Su Bearer lo pone `plataformaInterceptor`.
 */
const PREFIJO_PLATAFORMA = '/api/admin/';

/**
 * Inyecta `Authorization: Bearer <JWT>` del tenant en toda petición saliente al
 * backend.
 *
 * Deja pasar sin tocar las peticiones a otros orígenes: si la app pide un asset
 * a un CDN, mandarle el token del tenant sería una fuga de credenciales.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const token = store.token();

  if (!token || esRutaPublica(req.url) || esDePlataforma(req.url) || !esApiPropia(req.url)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

function esRutaPublica(url: string): boolean {
  return RUTAS_PUBLICAS.some((ruta) => url.includes(ruta));
}

function esDePlataforma(url: string): boolean {
  return url.includes(PREFIJO_PLATAFORMA);
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
