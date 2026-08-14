import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../errors/api-error.model';
const MAX_REINTENTOS = 2;
/** 30 s: dentro de esa ventana, volver a una pantalla no vuelve a pedir. */
const STALE_TIME_MS = 30_000;
/** 24 h: la caché sobrevive al cierre de la pestaña y al arranque sin red. */
const GC_TIME_MS = 24 * 60 * 60 * 1000;
/**
 * Cliente de TanStack Query de toda la app.
 *
 * Se crea a nivel de módulo y no dentro de un componente a propósito: además de
 * los hooks, lo necesitan `AuthService.logout()` y `PlataformaService.salir()`
 * para vaciar la caché al cerrar sesión, y esos son módulos sin acceso al árbol
 * de React. Es el mismo motivo por el que `authStore` es un singleton.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      // Caché larga a propósito: es lo que hace que al abrir la app sin red
      // las pantallas pinten datos al instante en vez de un spinner vacío.
      gcTime: GC_TIME_MS,
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
function esErrorDefinitivo(status) {
  return status >= 400 && status < 500;
}
