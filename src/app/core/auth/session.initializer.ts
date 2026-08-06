import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/**
 * Refresca el contexto del usuario al arrancar, si hay token.
 *
 * No bloquea el arranque (no devuelve la promesa): el shell se pinta al
 * instante con el `me` cacheado en localStorage y los roles/módulos se
 * actualizan cuando la respuesta llegue. Ese es justamente el Flujo 1 — el
 * usuario ve la app, no un spinner, aunque el backend tarde o no esté.
 *
 * Si el token ya caducó, ni se intenta: se limpia y el guard manda a /login.
 */
export function provideSessionBootstrap(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const store = inject(AuthStore);
    const auth = inject(AuthService);

    if (!store.token()) return;

    if (!store.isAuthenticated()) {
      store.clear();
      return;
    }

    // Un fallo aquí no debe tumbar el arranque: sin red seguimos con la caché,
    // y si el token murió, el interceptor de 401 hace el logout.
    void auth.loadMe().catch(() => undefined);
  });
}
