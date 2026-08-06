import type { Routes } from '@angular/router';
import { moduloGuard } from './core/auth/guards/permission.guard';

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
  { path: '**', redirectTo: '/404' },
];
