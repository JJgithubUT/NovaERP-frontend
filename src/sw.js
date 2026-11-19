/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';
import { drenarOutbox } from './core/offline/outbox-drain';
import { OUTBOX_SYNC_TAG } from './core/offline/outbox.model';

/**
 * Service Worker de NovaERP.
 *
 * Hace dos cosas, y la segunda es la que justifica escribirlo a mano en vez de
 * dejar que Workbox lo genere:
 *
 * 1. **Precachea el shell** para que la aplicación abra al instante y sin red.
 *    La lista de archivos la inyecta Workbox en `self.__WB_MANIFEST`.
 * 2. **Drena el outbox desde `sync`**, que es lo que permite que las escrituras
 *    guardadas sin conexión salgan aunque el usuario haya cerrado la pestaña.
 *    Solo Chromium implementa Background Sync; en Safari y Firefox el drenado
 *    lo hace la aplicación, y por eso `outbox-drain` es compartido.
 *
 * Lo que **no** hace: cachear respuestas del API. Los datos de un ERP cambian y
 * son por tenant; servir una lista de stock vieja desde el SW sería peor que
 * decir que no hay conexión. De la caché de datos se encarga TanStack Query,
 * que sabe invalidar.
 */

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {never} */ (self);

cleanupOutdatedCaches();
/*
 * La referencia va literal y sin alias: Workbox inyecta el manifiesto buscando
 * la cadena `self.__WB_MANIFEST` en el fuente, así que escribirla a través de
 * `sw` hace fallar la compilación con «unable to find a place to inject».
 */
precacheAndRoute(self.__WB_MANIFEST);

/*
 * Cualquier navegación sirve el `index.html` precacheado: la aplicación es una
 * SPA y sus rutas (`/acme/ventas`) no existen como archivos.
 *
 * `/api` queda fuera a propósito — es el backend, no una ruta de la SPA.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  }),
);

sw.addEventListener('sync', (evento) => {
  if (evento.tag !== OUTBOX_SYNC_TAG) return;
  /*
   * Sin `tenantSlug`: al despertarse, el SW no sabe quién tiene la sesión
   * abierta y debe drenar todo lo pendiente del dispositivo. Cada item lleva su
   * propio token.
   */
  evento.waitUntil(
    (async () => {
      const { sinRed } = await drenarOutbox();
      /*
       * Si quedó algo sin enviar, la promesa tiene que *rechazar*: es la única
       * señal con la que el navegador sabe que el sync falló y lo reprograma
       * con backoff. Si resuelve, da el tag por cumplido y lo pendiente se
       * queda en IndexedDB hasta que alguien vuelva a abrir la app.
       */
      if (sinRed) throw new Error('Outbox sin drenar: el backend no respondió.');
    })(),
  );
});

/** Permite a la aplicación activar una versión nueva sin esperar. */
sw.addEventListener('message', (evento) => {
  if (evento.data?.type === 'SKIP_WAITING') void sw.skipWaiting();
});