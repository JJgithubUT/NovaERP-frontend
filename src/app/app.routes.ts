import { inject } from '@angular/core';
import { Router, type CanMatchFn, type Routes } from '@angular/router';
import { AuthStore } from './core/auth/auth.store';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { tenantGuard } from './core/auth/guards/tenant.guard';

/**
 * Manda la raíz al tenant del token, o al login si no hay sesión. Se resuelve
 * en runtime porque el slug no se conoce hasta que hay token.
 */
const rootRedirect: CanMatchFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const slug = store.tenantSlug();
  return router.createUrlTree(store.isAuthenticated() && slug ? ['/', slug] : ['/login']);
};

/**
 * Todas las rutas de la app cuelgan de `/:tenant`. No es cosmético: hace que el
 * tenant sea explícito en cada URL, que los enlaces compartidos sean
 * inequívocos, y le da al `tenantGuard` algo concreto contra qué validar
 * (Flujo 2).
 */
export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    /**
     * Pública y **sin `guestGuard`**: quien activa su cuenta no tiene sesión,
     * pero puede quedarle un token viejo en este navegador. Mandarlo a su
     * tenant por eso le impediría canjear el código.
     */
    path: 'activar',
    loadComponent: () => import('./features/auth/activar/activar.page').then((m) => m.ActivarPage),
  },
  {
    /**
     * Portal de plataforma (SysAdmin). Superficie separada: su propia sesión, su
     * propio layout y ninguna dependencia del tenant.
     *
     * El segmento es `admin` porque está en `core.dominio_reservado`: ningún
     * tenant puede registrarse con ese slug, así que no puede colisionar con
     * `:tenant`. Los guards viven dentro de sus rutas hijas.
     */
    path: 'admin',
    loadChildren: () =>
      import('./features/plataforma/plataforma.routes').then((m) => m.plataformaRoutes),
  },
  {
    /**
     * Canje del enlace de alta de una organización. Pública y **sin
     * `guestGuard`**, por lo mismo que `activar`: quien la usa no tiene sesión,
     * pero puede quedarle un token viejo en este navegador.
     */
    path: 'activar-organizacion',
    title: 'Activar organización · NovaERP',
    loadComponent: () =>
      import('./features/auth/activar-tenant/activar-tenant.page').then((m) => m.ActivarTenantPage),
  },
  {
    /**
     * RF-18. Las dos son públicas y **sin `guestGuard`**, igual que `activar`:
     * quien las usa no tiene sesión, pero puede quedarle un token viejo en este
     * navegador y mandarlo a su tenant le impediría recuperar la cuenta.
     */
    path: 'recuperar',
    title: 'Restablecer contraseña · NovaERP',
    loadComponent: () =>
      import('./features/auth/recuperar/recuperar.page').then((m) => m.RecuperarPage),
  },
  {
    path: 'restablecer',
    title: 'Nueva contraseña · NovaERP',
    loadComponent: () =>
      import('./features/auth/restablecer/restablecer.page').then((m) => m.RestablecerPage),
  },
  {
    path: '404',
    loadComponent: () =>
      import('./features/errors/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: '403',
    loadComponent: () =>
      import('./features/errors/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: '',
    pathMatch: 'full',
    canMatch: [rootRedirect],
    children: [],
  },
  {
    // El orden importa: 'login', 'admin', 'activar…', '404' y '403' se declaran
    // antes para que `:tenant` no se los coma tratándolos como slugs.
    path: ':tenant',
    canMatch: [authGuard, tenantGuard],
    loadComponent: () => import('./layout/shell/shell.layout').then((m) => m.ShellLayout),
    loadChildren: () => import('./tenant.routes').then((m) => m.tenantRoutes),
  },
  { path: '**', redirectTo: '404' },
];
