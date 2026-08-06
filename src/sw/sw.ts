/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { drenarOutbox } from '../app/core/offline/outbox-drain';
import { OUTBOX_SYNC_TAG } from '../app/core/offline/outbox.model';

declare const self: ServiceWorkerGlobalScope;

/**
 * Service Worker de NovaERP.
 *
 * Es el proxy inverso dentro del navegador: sirve el shell desde caché local
 * (Flujo 1) y drena el outbox cuando vuelve la red (Flujo 4).
 *
 * Lo que deliberadamente **no** hace: cachear las respuestas de `/api/`. Los
 * datos de negocio ya tienen dos capas de caché por encima —TanStack Query en
 * memoria e IndexedDB en disco—, y las tres compitiendo darían pantallas que
 * muestran datos de tres edades distintas sin que nadie sepa cuál gana. El SW
 * se queda con los assets; los datos son de las otras capas.
 */

// Precache del shell. `__WB_MANIFEST` lo inyecta workbox-build en el build:
// lleva la lista de assets con su hash de revisión.
precacheAndRoute(self.__WB_MANIFEST);

/**
 * Toda navegación devuelve el index precacheado, sin tocar la red. Esto es el
 * Flujo 1: la app abre instantánea, y da igual si el usuario entró por
 * `/acme/inventario/productos` — el router de Angular resuelve desde ahí.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    // El SW no debe secuestrar las llamadas a la API ni el propio sw.js.
    denylist: [/^\/api\//, /^\/sw\.js$/],
  }),
);

// JS y CSS con hash en el nombre: el precache los cubre, pero los chunks lazy
// que se pidan después caen aquí. Stale-While-Revalidate = pinta al instante y
// actualiza en segundo plano.
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'novaerp-assets',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// Fuentes e imágenes: cambian poco, CacheFirst y a otra cosa.
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'novaerp-media',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

/**
 * Background Sync (Flujo 4). El navegador despierta al SW cuando recupera la
 * red, aunque la pestaña esté cerrada.
 *
 * `event.waitUntil` con la promesa del drenado es lo que le dice al navegador
 * que no mate al worker a mitad del trabajo. Si la promesa rechaza, el
 * navegador reintenta el sync solo, con backoff propio.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === OUTBOX_SYNC_TAG) {
    event.waitUntil(drenarOutbox());
  }
});

/**
 * La app pide activar la versión nueva cuando el usuario acepta el aviso.
 * Nunca se hace `skipWaiting()` por decisión propia: recargar sin avisar puede
 * costarle a alguien un formulario a medio llenar.
 */
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

clientsClaim();
