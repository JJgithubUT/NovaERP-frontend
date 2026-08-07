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
      {
        path: 'roles',
        title: 'Roles · NovaERP',
        loadComponent: () => import('./roles/roles.page').then((m) => m.RolesPage),
      },
      {
        path: 'seguridad',
        title: 'Seguridad · NovaERP',
        loadComponent: () => import('./seguridad/seguridad.page').then((m) => m.SeguridadPage),
      },
      {
        path: 'bitacora',
        title: 'Bitácora · NovaERP',
        loadComponent: () => import('./bitacora/bitacora.page').then((m) => m.BitacoraPage),
      },
      {
        path: 'actividad',
        title: 'Actividad · NovaERP',
        loadComponent: () => import('./actividad/actividad.page').then((m) => m.ActividadPage),
      },
    ],
  },
];
