/**
 * Tipos que el lib `webworker` de TypeScript todavía no trae.
 *
 * Background Sync sigue siendo una spec de borrador (solo Chromium la
 * implementa), así que sus tipos no están en la librería estándar y hay que
 * declararlos a mano.
 */

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  /** El navegador reintentará el sync si vuelve a fallar. */
  readonly lastChance: boolean;
}

interface ServiceWorkerGlobalScopeEventMap {
  sync: SyncEvent;
}

interface ServiceWorkerGlobalScope {
  /**
   * Lista de assets a precachear. La inyecta `workbox-build` en el build:
   * en el código fuente es solo un marcador.
   */
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
}
