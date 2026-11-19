import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** Cada cuánto se pregunta si hay un build nuevo. */
const INTERVALO_REVISION_MS = 60 * 60 * 1000;

/**
 * Registro del Service Worker y aviso de versión nueva.
 *
 * Vive fuera de React por la misma razón que `estadoRed` y `colaSync`: antes el
 * SW lo registraba `useRegisterSW` dentro de `ActualizacionPrompt`, y ese
 * componente solo existe dentro del shell. Quien entraba por primera vez se
 * quedaba en el login sin SW —sin precache y sin Background Sync— hasta iniciar
 * sesión, y cada login/logout volvía a montar el hook y a registrar.
 *
 * Aquí se registra una sola vez, desde `main.jsx`, y la UI solo se suscribe.
 */
class RegistroPwa {
  hayActualizacion = false;
  listeners = new Set();
  iniciado = false;

  /** @type {(recargar?: boolean) => Promise<void>} */
  aplicar = async () => {};

  iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;

    this.aplicar = registerSW({
      onNeedRefresh: () => this.commit(true),
      onRegisteredSW: (urlSw, registro) => {
        if (!registro) return;
        /*
         * Una pestaña de ERP se queda abierta días. Sin esto, el navegador solo
         * busca un SW nuevo al navegar, y en una SPA eso casi nunca pasa.
         */
        setInterval(async () => {
          if (registro.installing || !navigator.onLine) return;
          const resp = await fetch(urlSw, { cache: 'no-store' }).catch(() => null);
          if (resp?.ok) await registro.update();
        }, INTERVALO_REVISION_MS);
      },
      onRegisterError: (error) => {
        console.error('No se pudo registrar el Service Worker', error);
      },
    });
  }

  subscribe = (/** @type {() => void} */ listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.hayActualizacion;

  /** «Ahora no»: oculta el aviso; el SW nuevo sigue esperando. */
  posponer() {
    this.commit(false);
  }

  /** Manda `SKIP_WAITING` al SW nuevo y recarga cuando toma el control. */
  actualizar() {
    return this.aplicar(true);
  }

  /** @param {boolean} valor */
  commit(valor) {
    if (this.hayActualizacion === valor) return;
    this.hayActualizacion = valor;
    for (const listener of this.listeners) listener();
  }
}

export const registroPwa = new RegistroPwa();

/** ¿Hay una versión nueva esperando? */
export function useHayActualizacion() {
  return useSyncExternalStore(registroPwa.subscribe, registroPwa.getState, registroPwa.getState);
}