import type { Routes } from '@angular/router';

export const comprasRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'proveedores' },
  {
    path: 'proveedores',
    title: 'Proveedores · NovaERP',
    loadComponent: () => import('./proveedores/proveedores.page').then((m) => m.ProveedoresPage),
  },
];
