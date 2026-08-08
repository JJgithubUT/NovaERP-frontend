import type { Routes } from '@angular/router';
import { invitadoPlataformaGuard, plataformaGuard } from '../../core/plataforma/plataforma.guard';

/**
 * Rutas del portal de plataforma, colgadas de `/admin`.
 *
 * El acceso queda **fuera** del layout: la barra del portal muestra quién opera
 * y hasta cuándo vive su sesión, y no hay nada de eso que mostrar antes de
 * entrar.
 */
export const plataformaRoutes: Routes = [
  {
    path: 'acceso',
    title: 'Portal de plataforma · NovaERP',
    canMatch: [invitadoPlataformaGuard],
    loadComponent: () => import('./acceso/acceso.page').then((m) => m.AccesoPage),
  },
  {
    path: '',
    canMatch: [plataformaGuard],
    loadComponent: () => import('./plataforma.layout').then((m) => m.PlataformaLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'organizaciones' },
      {
        path: 'organizaciones',
        title: 'Organizaciones · NovaERP',
        loadComponent: () =>
          import('./organizaciones/organizaciones.page').then((m) => m.OrganizacionesPage),
      },
      {
        path: 'organizaciones/:id',
        title: 'Organización · NovaERP',
        loadComponent: () =>
          import('./organizaciones/organizacion.page').then((m) => m.OrganizacionPage),
      },
    ],
  },
];
