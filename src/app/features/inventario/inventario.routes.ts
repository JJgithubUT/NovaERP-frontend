import type { Routes } from '@angular/router';

export const inventarioRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  {
    path: 'productos',
    title: 'Productos · NovaERP',
    loadComponent: () => import('./productos/productos.page').then((m) => m.ProductosPage),
  },
  {
    path: 'almacenes',
    title: 'Almacenes · NovaERP',
    loadComponent: () => import('./almacenes/almacenes.page').then((m) => m.AlmacenesPage),
  },
];
