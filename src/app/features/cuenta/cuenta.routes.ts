import type { Routes } from '@angular/router';

export const cuentaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./cuenta.layout').then((m) => m.CuentaLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'perfil' },
      {
        path: 'perfil',
        title: 'Mi perfil · NovaERP',
        loadComponent: () => import('./perfil.page').then((m) => m.PerfilPage),
      },
      {
        path: 'sesiones',
        title: 'Mis sesiones · NovaERP',
        loadComponent: () => import('./sesiones.page').then((m) => m.SesionesPage),
      },
    ],
  },
];
