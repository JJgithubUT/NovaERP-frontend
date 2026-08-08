import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { PlataformaStore } from './plataforma.store';
import { RUTA_ACCESO_PLATAFORMA, RUTA_ORGANIZACIONES } from './rutas';

/**
 * Exige sesión de plataforma. `canMatch` y no `canActivate`, igual que el guard
 * de tenant: así Angular ni siquiera descarga el chunk del portal si no hay
 * sesión.
 *
 * Es una comprobación local sobre el `exp` del token. El backend sigue siendo
 * la autoridad: una sesión revocada, o la de una cuenta desactivada, tiene un
 * token todavía vigente y solo se cae en el primer 401 — que el interceptor
 * convierte en logout. Este guard evita el parpadeo del portal cuando no hay
 * token en absoluto, que es el caso común.
 */
export const plataformaGuard: CanMatchFn = () => {
  const store = inject(PlataformaStore);
  const router = inject(Router);

  if (store.autenticado()) return true;
  return router.createUrlTree([RUTA_ACCESO_PLATAFORMA]);
};

/** Impide volver a la pantalla de acceso con sesión de plataforma abierta. */
export const invitadoPlataformaGuard: CanMatchFn = () => {
  const store = inject(PlataformaStore);
  const router = inject(Router);

  if (!store.autenticado()) return true;
  return router.createUrlTree([RUTA_ORGANIZACIONES]);
};
