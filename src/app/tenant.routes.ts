import type { Routes } from '@angular/router';
import { moduloGuard, permisoGuard } from './core/auth/guards/permission.guard';

/**
 * Rutas de dentro del shell, ya con tenant resuelto.
 *
 * Cada módulo se protege con su `moduloGuard` y se carga lazy: si el tenant no
 * contrató Compras, ese chunk nunca se descarga.
 *
 * Los códigos ('INVENTARIO', 'VENTAS', 'COMPRAS') son los que devuelve
 * `/api/core/me/` en `modulos[].codigo`.
 */
export const tenantRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    loadComponent: () => import('./features/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'inventario',
    canMatch: [moduloGuard('INVENTARIO')],
    loadChildren: () =>
      import('./features/inventario/inventario.routes').then((m) => m.inventarioRoutes),
  },
  {
    path: 'ventas',
    canMatch: [moduloGuard('VENTAS')],
    loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.ventasRoutes),
  },
  {
    path: 'compras',
    canMatch: [moduloGuard('COMPRAS')],
    loadChildren: () => import('./features/compras/compras.routes').then((m) => m.comprasRoutes),
  },
  /**
   * Cuenta y administración no cuelgan de un módulo contratado: la primera es
   * autoservicio para cualquier usuario, la segunda va por permiso. Por eso no
   * llevan `moduloGuard` — llevaría a un 404 en tenants que sí deben verlas.
   */
  {
    path: 'cuenta',
    loadChildren: () => import('./features/cuenta/cuenta.routes').then((m) => m.cuentaRoutes),
  },
  {
    path: 'administracion',
    canMatch: [permisoGuard('core:usuarios:leer')],
    loadChildren: () =>
      import('./features/administracion/administracion.routes').then((m) => m.administracionRoutes),
  },
  { path: '**', redirectTo: '/404' },
];
