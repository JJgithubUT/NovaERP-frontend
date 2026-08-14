import { useSyncExternalStore } from 'react';

/** @typedef {'exito' | 'error' | 'aviso'} ToastTono */
/** @typedef {{ id: number, tono: ToastTono, mensaje: string }} Toast */

const DURACION_MS = 4000;

/**
 * Avisos efímeros tras una mutación ("Cliente creado", "Sin conexión…").
 *
 * Es solo para confirmar algo que el usuario acaba de hacer. Un error que
 * requiere corregir un campo **no va aquí**: va pegado al campo, donde se
 * arregla. Si el aviso se puede perder sin consecuencia, es un toast.
 *
 * Es un singleton observable y no un contexto de React por la misma razón que
 * el store de sesión: lo dispara código que no siempre es un componente (el
 * `onError` de una mutación, el drenado del outbox).
 */
class ToastStore {
  /** @type {readonly Toast[]} */
  state = [];
  listeners = new Set();
  siguienteId = 0;
  /** @type {Map<number, ReturnType<typeof setTimeout>>} */
  temporizadores = new Map();

  subscribe = (/** @type {() => void} */ listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  /** @param {string} mensaje */
  exito(mensaje) {
    this.mostrar('exito', mensaje);
  }

  /** @param {string} mensaje */
  error(mensaje) {
    this.mostrar('error', mensaje);
  }

  /** @param {string} mensaje */
  aviso(mensaje) {
    this.mostrar('aviso', mensaje);
  }

  /** @param {number} id */
  descartar(id) {
    clearTimeout(this.temporizadores.get(id));
    this.temporizadores.delete(id);
    this.commit(this.state.filter((toast) => toast.id !== id));
  }

  /**
   * @param {ToastTono} tono
   * @param {string} mensaje
   */
  mostrar(tono, mensaje) {
    const id = this.siguienteId++;
    this.commit([...this.state, { id, tono, mensaje }]);
    this.temporizadores.set(
      id,
      setTimeout(() => this.descartar(id), DURACION_MS),
    );
  }

  /** @param {readonly Toast[]} state */
  commit(state) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

export const toasts = new ToastStore();

/** Suscribe el host a la pila. */
export function useToasts() {
  return useSyncExternalStore(toasts.subscribe, toasts.getState, toasts.getState);
}
