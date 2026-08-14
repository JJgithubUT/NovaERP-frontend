import { useSyncExternalStore } from 'react';
import { liveQuery } from 'dexie';
import { authStore } from '../auth/auth.store';
import { db } from './nova-db';
import { drenarOutbox } from './outbox-drain';
import { estadoRed } from './network-status';
import { OUTBOX_SYNC_TAG } from './outbox.model';

/**
 * @typedef {import('./outbox.model.js').OutboxItem} OutboxItem
 * @typedef {{
 *   entidad: import('./outbox.model.js').Entidad,
 *   operacion: import('./outbox.model.js').OutboxOperacion,
 *   method: 'POST' | 'PATCH' | 'DELETE',
 *   url: string,
 *   body: unknown,
 * }} EncolarInput
 */

/**
 * Cara visible del outbox (Flujo 4): encola, expone lo pendiente a la UI y
 * dispara el drenado.
 *
 * El drenado real vive en `outbox-drain.js`, compartido con el Service Worker.
 * Aquí solo se decide *cuándo* drenar, y hay dos caminos a propósito:
 *
 * 1. **Background Sync del SW** — el bueno. Procesa la cola aunque el usuario
 *    cerrara la pestaña. Solo existe en Chromium.
 * 2. **Drenado desde la app** — el fallback, y lo único que hay en Safari y
 *    Firefox. Requiere la pestaña abierta.
 *
 * Los dos pueden dispararse a la vez sin duplicar envíos: `outbox-drain` toma
 * cada item en una transacción antes de mandarlo.
 */
class ColaSincronizacion {
  /** @type {readonly OutboxItem[]} */
  pendientes = [];
  listeners = new Set();
  drenando = false;

  constructor() {
    this.observarPendientes();

    // Al recuperar la red, intenta vaciar lo que quedó guardado.
    estadoRed.subscribe(() => {
      if (estadoRed.getState() && this.pendientes.some((i) => i.estado === 'pendiente')) {
        void this.drenar();
      }
    });
  }

  subscribe = (/** @type {() => void} */ listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.pendientes;

  /**
   * Captura una petición que no pudo salir.
   *
   * @param {EncolarInput} input
   * @returns {Promise<OutboxItem>}
   */
  async encolar(input) {
    const tenantSlug = authStore.tenantSlug();
    const token = authStore.token();

    if (!tenantSlug || !token) {
      throw new Error('No se puede encolar sin sesión activa.');
    }

    /** @type {OutboxItem} */
    const item = {
      id: crypto.randomUUID(),
      tenantSlug,
      token,
      createdAt: Date.now(),
      intentos: 0,
      estado: 'pendiente',
      ...input,
    };

    await db.outbox.add(item);
    /*
     * Sin `await`: el encolado termina en cuanto el item está a salvo en
     * IndexedDB. Pedir la sincronización es mejor-esfuerzo y no debe retrasar
     * —ni mucho menos bloquear— la respuesta al formulario que está esperando.
     */
    void this.pedirSincronizacion();
    return item;
  }

  /** Descarta un item que el backend rechazó y el usuario no va a corregir. */
  async descartar(/** @type {string} */ id) {
    await db.outbox.delete(id);
  }

  /** Devuelve a la cola un item fallido, para reintentarlo. */
  async reintentar(/** @type {string} */ id) {
    await db.outbox.update(id, { estado: 'pendiente', ultimoError: undefined });
    await this.pedirSincronizacion();
  }

  async drenar() {
    if (this.drenando) return;
    this.drenando = true;
    try {
      await drenarOutbox(authStore.tenantSlug() ?? undefined);
    } finally {
      this.drenando = false;
    }
  }

  /**
   * Pide al Service Worker que procese la cola en segundo plano. Si el
   * navegador no soporta Background Sync (Safari, Firefox), drena aquí mismo.
   */
  async pedirSincronizacion() {
    try {
      const registro = await registroDelServiceWorker();
      if (registro && 'sync' in registro) {
        await registro.sync.register(OUTBOX_SYNC_TAG);
        return;
      }
    } catch {
      // Sin SW o sin permiso: cae al drenado local.
    }
    void this.drenar();
  }

  /**
   * `liveQuery` de Dexie reemite cada vez que la tabla cambia, venga el cambio
   * de esta pestaña o del Service Worker. Es lo que mantiene el contador del
   * banner al día sin sondear.
   */
  observarPendientes() {
    liveQuery(() => db.outbox.orderBy('createdAt').toArray()).subscribe({
      next: (items) => {
        this.pendientes = items;
        for (const listener of this.listeners) listener();
      },
      error: () => {
        // IndexedDB no disponible (modo privado de algunos navegadores): la
        // aplicación sigue funcionando online, solo sin cola offline.
        this.pendientes = [];
      },
    });
  }
}

/**
 * El registro del Service Worker, o `null` si no lo hay.
 *
 * `navigator.serviceWorker.ready` **nunca resuelve** cuando no hay ningún SW
 * registrado — no rechaza, se queda pendiente para siempre. Es exactamente el
 * caso del servidor de desarrollo, y esperarlo dejaba el encolado colgado y el
 * formulario en «Guardando…» indefinidamente.
 *
 * Por eso se compite contra un temporizador: si en un segundo no hay SW, se
 * asume que no lo va a haber y se drena desde la aplicación.
 */
function registroDelServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolver) => setTimeout(() => resolver(null), 1000)),
  ]);
}

export const colaSync = new ColaSincronizacion();

/** Items del outbox, para el banner. */
export function usePendientes() {
  return useSyncExternalStore(colaSync.subscribe, colaSync.getState, colaSync.getState);
}
