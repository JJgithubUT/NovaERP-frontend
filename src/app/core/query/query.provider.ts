import type { Provider } from '@angular/core';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { withDevtools } from '@tanstack/angular-query-experimental/devtools';
import { environment } from '../../../environments/environment';
import { isApiError } from '../errors/api-error.model';

const MAX_REINTENTOS = 2;

/**
 * Se exporta aparte del provider para que los tests puedan crear un cliente con
 * la misma configuración de producción sin arrastrar las devtools.
 */
export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: environment.queryStaleTimeMs,

        // Caché larga a propósito: es lo que hace que al abrir la app sin red
        // las pantallas pinten datos al instante en vez de un spinner vacío.
        gcTime: environment.queryGcTimeMs,

        retry: (failureCount, error) => {
          // Un 4xx no se arregla reintentando: el 401 ya disparó el logout, el
          // 404 no va a aparecer, y el 422 es una regla de negocio.
          if (isApiError(error) && esErrorDefinitivo(error.status)) return false;
          return failureCount < MAX_REINTENTOS;
        },

        // Sin red no gastes reintentos: TanStack pausa la query y la reanuda
        // sola al reconectar, pero deja servir lo que ya haya en caché.
        networkMode: 'offlineFirst',

        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Las mutaciones no se reintentan solas: duplicarían escrituras. Quien
        // decide reintentar es el outbox, que sí controla el orden.
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
  });
}

function esErrorDefinitivo(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Las devtools se importan siempre desde el subpath `/devtools`: su `exports`
 * resuelve a un stub vacío fuera de modo desarrollo, así que no llegan al bundle
 * de producción aunque aquí se llamen sin condicional.
 */
export function provideQuery(): Provider[] {
  return provideTanStackQuery(crearQueryClient(), withDevtools());
}
