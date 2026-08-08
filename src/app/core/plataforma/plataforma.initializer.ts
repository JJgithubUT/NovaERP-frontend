import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';
import { PlataformaService } from './plataforma.service';
import { PlataformaStore } from './plataforma.store';

/**
 * Rehidrata la sesión del portal al arrancar, si hay token de plataforma.
 *
 * No bloquea el arranque, igual que el bootstrap de tenant: el layout del
 * portal se pinta y muestra su propio estado mientras `me()` viaja. La
 * diferencia es que aquí no hay contexto cacheado que enseñar entretanto —el
 * portal no es offline-first—, así que el layout espera a la respuesta antes de
 * dar por buena la identidad.
 *
 * Sin esto, el portal daría por válida la mera existencia del token y se
 * enteraría del vencimiento cuando fallara el primer listado.
 */
export function providePlataformaBootstrap(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const store = inject(PlataformaStore);
    const plataforma = inject(PlataformaService);

    if (!store.token()) return;

    // Token caducado: se descarta sin gastar una petición que ya sabemos que
    // responde 401.
    if (!store.autenticado()) {
      store.limpiar();
      return;
    }

    // Un fallo aquí no debe tumbar el arranque de la aplicación entera: el
    // guard y el interceptor de 401 cubren el resto.
    void plataforma.cargarMe().catch(() => undefined);
  });
}
