import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthStore } from '../auth.store';

/**
 * Exige sesión válida. Va como `canMatch` (no `canActivate`) a propósito: así
 * Angular ni siquiera descarga el chunk lazy del módulo protegido si el usuario
 * no tiene sesión.
 */
export const authGuard: CanMatchFn = (_route, segments) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.isAuthenticated()) return true;

  const intento = '/' + segments.map((segment) => segment.path).join('/');
  return router.createUrlTree(['/login'], {
    // Para devolver al usuario a donde iba una vez que entre.
    queryParams: intento === '/' ? {} : { redirectTo: intento },
  });
};

/** Impide volver al login con sesión abierta. */
export const guestGuard: CanMatchFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.isAuthenticated()) return true;
  return router.createUrlTree(['/', store.tenantSlug()]);
};
