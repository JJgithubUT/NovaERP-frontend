import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Estado de conectividad como signal.
 *
 * `navigator.onLine` solo sabe si hay una interfaz de red levantada, no si el
 * backend responde — un WiFi de hotel sin salida reporta `true`. Por eso el
 * interceptor de outbox no confía en este flag para decidir si encolar: usa el
 * fallo real de la petición. Este servicio es para la UI (el banner) y para
 * saber cuándo intentar drenar la cola.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly _online = signal(navigator.onLine);

  readonly online = this._online.asReadonly();

  constructor() {
    const alConectar = () => this._online.set(true);
    const alDesconectar = () => this._online.set(false);

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    });
  }

  /** Marca la red como caída ante un fallo real, sin esperar al evento. */
  reportarFallo(): void {
    this._online.set(false);
  }
}
