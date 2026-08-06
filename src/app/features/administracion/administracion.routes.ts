import type { Routes } from '@angular/router';

export const administracionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./administracion.layout').then((m) => m.AdministracionLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        title: 'Usuarios · NovaERP',
        loadComponent: () => import('./usuarios/usuarios.page').then((m) => m.UsuariosPage),
      },
    ],
  },
];
