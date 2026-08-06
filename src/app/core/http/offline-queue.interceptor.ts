import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { createApiError, isApiError } from '../errors/api-error.model';
import { SyncQueueService } from '../offline/sync-queue.service';
import type { Entidad, OutboxOperacion } from '../offline/outbox.model';

const METODOS_ENCOLABLES: ReadonlySet<string> = new Set(['POST', 'PATCH', 'DELETE']);

/**
 * Captura las escrituras que no pudieron salir por falta de red y las guarda en
 * el outbox (Flujo 4).
 *
 * Solo actúa sobre fallos de red (`kind === 'network'`). Un 422 o un 404 son
 * respuestas legítimas del servidor y tienen que llegar al formulario tal cual.
 *
 * No inventa una respuesta exitosa falsa: re-lanza el error con `queued: true`.
 * Así la mutación distingue "se guardó local, mantén el cambio en pantalla" de
 * "falló de verdad, deshaz el cambio optimista".
 */
export const offlineQueueInterceptor: HttpInterceptorFn = (req, next) => {
  const queue = inject(SyncQueueService);

  if (!METODOS_ENCOLABLES.has(req.method) || !esCatalogo(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isApiError(error) || error.kind !== 'network') {
        return throwError(() => error);
      }

      const entidad = entidadDe(req.url);
      if (!entidad) return throwError(() => error);

      /**
       * Se resuelve primero *qué* error corresponde y se lanza una sola vez al
       * final. Encadenar un `catchError` después de un `throwError` no sirve
       * aquí: atraparía también el error intencionado de más arriba y volvería
       * a sustituirlo por el original, con lo que `queued` no llegaría nunca.
       */
      const encolado = queue
        .encolar({
          entidad,
          operacion: operacionDe(req),
          method: req.method as 'POST' | 'PATCH' | 'DELETE',
          url: req.urlWithParams,
          body: req.body,
        })
        .then(
          () =>
            createApiError({
              ...error,
              queued: true,
              message: 'Sin conexión. El cambio se guardó y se enviará al reconectar.',
            }),
          // Si ni siquiera se pudo encolar (sin sesión, IndexedDB lleno), el
          // cambio se perdió: sería mentir marcarlo como guardado. Va el error
          // de red original, sin `queued`.
          () => error,
        );

      return from(encolado).pipe(switchMap((resultado) => throwError(() => resultado)));
    }),
  );
};

const RUTAS: ReadonlyArray<readonly [string, Entidad]> = [
  ['/api/inventario/productos/', 'productos'],
  ['/api/inventario/almacenes/', 'almacenes'],
  ['/api/ventas/clientes/', 'clientes'],
  ['/api/compras/proveedores/', 'proveedores'],
];

function esCatalogo(url: string): boolean {
  return entidadDe(url) !== null;
}

function entidadDe(url: string): Entidad | null {
  return RUTAS.find(([ruta]) => url.includes(ruta))?.[1] ?? null;
}

function operacionDe(req: HttpRequest<unknown>): OutboxOperacion {
  if (req.method === 'POST') return 'crear';
  if (req.method === 'DELETE') return 'baja';
  return 'actualizar';
}
