import { useSyncExternalStore } from 'react';

/**
 * Estado de conectividad.
 *
 * `navigator.onLine` solo sabe si hay una interfaz de red levantada, no si el
 * backend responde — un WiFi de hotel sin salida reporta `true`. Por eso el
 * interceptor de outbox no confía en este flag para decidir si encolar: usa el
 * fallo real de la petición. Esto es para la UI (el banner) y para saber cuándo
 * intentar drenar la cola.
 */
class EstadoRed {
  online = navigator.onLine;
  listeners = new Set();

  constructor() {
    window.addEventListener('online', () => this.commit(true));
    window.addEventListener('offline', () => this.commit(false));
  }

  subscribe = (/** @type {() => void} */ listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.online;

  /** Marca la red como caída ante un fallo real, sin esperar al evento. */
  reportarFallo() {
    this.commit(false);
  }

  /** @param {boolean} valor */
  commit(valor) {
    if (this.online === valor) return;
    this.online = valor;
    for (const listener of this.listeners) listener();
  }
}

export const estadoRed = new EstadoRed();

/** ¿Hay red, según el navegador? */
export function useEstadoRed() {
  return useSyncExternalStore(estadoRed.subscribe, estadoRed.getState, estadoRed.getState);
}
