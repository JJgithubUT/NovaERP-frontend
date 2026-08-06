import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  type ApplicationConfig,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideSessionBootstrap } from './core/auth/session.initializer';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { offlineQueueInterceptor } from './core/http/offline-queue.interceptor';
import { sessionInterceptor } from './core/http/session.interceptor';
import { provideQuery } from './core/query/query.provider';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      // Los params de ruta llegan a los componentes como inputs con signals,
      // sin tener que inyectar ActivatedRoute en cada pantalla.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    /**
     * El orden de los interceptores es carga útil, no estética.
     *
     * Las **peticiones** los atraviesan en este orden; las **respuestas** lo
     * hacen al revés. Por eso `errorInterceptor` va al final: es el primero en
     * ver el error de vuelta, lo normaliza a `ApiError`, y los de arriba ya
     * reciben el tipo único de la app en vez de un `HttpErrorResponse` crudo.
     *
     * De abajo hacia arriba en el camino de vuelta:
     *   errorInterceptor      → traduce {mensaje}|{detail} a ApiError (Flujo 5)
     *   offlineQueueInterceptor → si fue fallo de red, lo encola (Flujo 4)
     *   sessionInterceptor    → si fue 401, logout global
     *   authInterceptor       → (solo actúa en la ida: inyecta el Bearer)
     */
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        sessionInterceptor,
        offlineQueueInterceptor,
        errorInterceptor,
      ]),
    ),

    provideQuery(),
    provideSessionBootstrap(),
  ],
};
