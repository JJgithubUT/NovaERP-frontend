import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthStore } from '../auth.store';

/**
 * Aislamiento de tenant en el enrutador (Flujo 2).
 *
 * Las rutas de la app van prefijadas con el slug del tenant
 * (`/acme/inventario/productos`). Este guard compara el slug de la URL con el
 * del JWT y, si no coinciden, corta ahí mismo.
 *
 * El punto no es la seguridad —el backend ya filtra por el `tenant_slug` del
 * token y responde 404 pase lo que pase—; es no mandar una petición que
 * sabemos de antemano que va a fallar, y no dejar al usuario mirando una
 * pantalla a medio cargar mientras lo descubre.
 *
 * Responde 404 y no 403, igual que el backend: confirmar que el tenant existe
 * ya sería filtrar información entre tenants.
 */
export const tenantGuard: CanMatchFn = (_route, segments) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  // En canMatch los segmentos traen los valores reales de la URL, no el patrón
  // `:tenant` de la definición de la ruta.
  const slugUrl = segments[0]?.path;
  const slugToken = store.tenantSlug();

  if (slugUrl && slugToken && slugUrl === slugToken) return true;

  return router.createUrlTree(['/404']);
};
