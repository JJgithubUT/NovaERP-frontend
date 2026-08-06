import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthStore } from '../auth.store';

/**
 * Exige que el módulo esté habilitado para el tenant.
 *
 * Los módulos vienen de `/api/core/me/` y son los mismos que arman el sidebar.
 * Este guard es lo que impide que alguien llegue a `/acme/inventario/productos`
 * escribiendo la URL cuando su tenant no contrató Inventario.
 */
export function moduloGuard(codigo: string): CanMatchFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (store.hasModulo(codigo)) return true;
    return router.createUrlTree(['/404']);
  };
}

/**
 * Exige uno o más permisos concretos.
 *
 * Ojo con un detalle real del backend: `permisos` puede llegar **vacío** aunque
 * el usuario tenga roles, si `rol_permiso` no está poblado todavía para ese rol.
 * Mientras el seed de permisos no esté completo, este guard dejaría a todo el
 * mundo fuera. Por eso las rutas del Sprint 1 usan `moduloGuard` y este queda
 * listo para cuando el backend pueble la tabla.
 */
export function permisoGuard(...codigos: readonly string[]): CanMatchFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (store.hasAnyPermiso(codigos)) return true;
    return router.createUrlTree(['/403']);
  };
}
