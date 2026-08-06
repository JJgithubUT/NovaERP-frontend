import type { Routes } from '@angular/router';

export const ventasRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'clientes' },
  {
    path: 'clientes',
    title: 'Clientes · NovaERP',
    loadComponent: () => import('./clientes/clientes.page').then((m) => m.ClientesPage),
  },
];
