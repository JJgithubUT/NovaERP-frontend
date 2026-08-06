import { Injectable, effect, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { AuthStore } from '../auth/auth.store';
import { db } from './nova-db';
import { drenarOutbox } from './outbox-drain';
import { NetworkStatusService } from './network-status.service';
import {
  OUTBOX_SYNC_TAG,
  type Entidad,
  type OutboxItem,
  type OutboxOperacion,
} from './outbox.model';

export interface EncolarInput {
  entidad: Entidad;
  operacion: OutboxOperacion;
  method: OutboxItem['method'];
  url: string;
  body: unknown;
  tempId?: string;
}

/**
 * Cara visible del outbox (Flujo 4): encola, expone lo pendiente a la UI y
 * dispara el drenado.
 *
 * El drenado real vive en `outbox-drain.ts`, compartido con el Service Worker.
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
@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private readonly authStore = inject(AuthStore);
  private readonly network = inject(NetworkStatusService);

  private readonly _pendientes = signal<readonly OutboxItem[]>([]);

  /** Items del tenant activo esperando o fallidos. El banner los cuenta. */
  readonly pendientes = this._pendientes.asReadonly();

  private drenando = false;

  constructor() {
    this.observarPendientes();

    effect(() => {
      const hayTrabajo = this._pendientes().some((item) => item.estado === 'pendiente');
      if (this.network.online() && hayTrabajo) {
        void this.drenar();
      }
    });
  }

  /** Captura una petición que no pudo salir. */
  async encolar(input: EncolarInput): Promise<OutboxItem> {
    const tenantSlug = this.authStore.tenantSlug();
    const token = this.authStore.token();

    if (!tenantSlug || !token) {
      throw new Error('No se puede encolar sin sesión activa.');
    }

    const item: OutboxItem = {
      id: crypto.randomUUID(),
      tenantSlug,
      token,
      createdAt: Date.now(),
      intentos: 0,
      estado: 'pendiente',
      ...input,
    };

    await db.outbox.add(item);
    await this.registrarBackgroundSync();
    return item;
  }

  /** Descarta un cambio pendiente. Es destructivo: confírmalo con el usuario. */
  async descartar(id: string): Promise<void> {
    await db.outbox.delete(id);
  }

  /** Devuelve un item 'fallido' a la cola tras corregir lo que lo tumbó. */
  async reintentar(id: string): Promise<void> {
    await db.outbox.update(id, { estado: 'pendiente', ultimoError: undefined, intentos: 0 });
    await this.drenar();
  }

  async drenar(): Promise<void> {
    if (this.drenando) return;
    this.drenando = true;

    try {
      const { sinRed } = await drenarOutbox(this.authStore.tenantSlug() ?? undefined);
      if (sinRed) this.network.reportarFallo();
    } finally {
      this.drenando = false;
    }
  }

  /**
   * Pide al navegador que despierte al SW cuando vuelva la red. Si no soporta
   * Background Sync (Safari, Firefox), falla en silencio: el `effect` cubre.
   */
  private async registrarBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const sync = (registration as ServiceWorkerRegistration & { sync?: SyncManager }).sync;
      await sync?.register(OUTBOX_SYNC_TAG);
    } catch {
      // Sin Background Sync. El drenado en app se encarga.
    }
  }

  /**
   * `liveQuery` reemite cuando IndexedDB cambia, venga el cambio de esta
   * pestaña, de otra, o del propio Service Worker. Es lo que hace que el banner
   * se apague solo cuando el SW termina de sincronizar en segundo plano.
   */
  private observarPendientes(): void {
    liveQuery(() =>
      db.outbox
        .where('tenantSlug')
        .equals(this.authStore.tenantSlug() ?? '')
        .toArray(),
    ).subscribe({
      next: (items) => this._pendientes.set(items),
      error: () => this._pendientes.set([]),
    });
  }
}

/** `sync` no está en los tipos DOM estándar todavía. */
interface SyncManager {
  register(tag: string): Promise<void>;
}
