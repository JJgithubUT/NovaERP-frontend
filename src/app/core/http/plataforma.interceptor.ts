import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PlataformaStore } from '../plataforma/plataforma.store';

/** Solo lo que cuelga de aquí lleva el token del portal. */
const PREFIJO_PLATAFORMA = '/api/admin/';

/** El propio login todavía no tiene token que mandar. */
const RUTAS_PUBLICAS = ['/api/admin/login/'];

/**
 * Inyecta el Bearer del SysAdmin, y **solo** en la superficie de plataforma.
 *
 * La pareja con `authInterceptor` es lo que mantiene aisladas las dos
 * superficies en el cliente, igual que el middleware las aísla en el servidor:
 * cada token viaja únicamente a las rutas que lo aceptan. Sin este reparto, un
 * navegador con las dos sesiones abiertas mandaría el token equivocado en
 * cuanto una pantalla llamara al prefijo de la otra.
 */
export const plataformaInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(PlataformaStore);
  const token = store.token();

  if (!token || !esDePlataforma(req.url) || esRutaPublica(req.url)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

function esDePlataforma(url: string): boolean {
  return url.includes(PREFIJO_PLATAFORMA);
}

function esRutaPublica(url: string): boolean {
  return RUTAS_PUBLICAS.some((ruta) => url.includes(ruta));
}
