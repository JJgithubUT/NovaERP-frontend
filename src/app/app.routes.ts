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
    // El orden importa: 'login', '404' y '403' se declaran antes para que
    // `:tenant` no se los coma tratándolos como slugs.
    path: ':tenant',
    canMatch: [authGuard, tenantGuard],
    loadComponent: () => import('./layout/shell/shell.layout').then((m) => m.ShellLayout),
    loadChildren: () => import('./tenant.routes').then((m) => m.tenantRoutes),
  },
  { path: '**', redirectTo: '404' },
];
