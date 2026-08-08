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
import { plataformaInterceptor } from './core/http/plataforma.interceptor';
import { plataformaSessionInterceptor } from './core/http/plataforma-session.interceptor';
import { sessionInterceptor } from './core/http/session.interceptor';
import { providePlataformaBootstrap } from './core/plataforma/plataforma.initializer';
import { provideQuery } from './core/query/query.provider';
import { provideTemaDeEntrada } from './core/theme/tema-entrada.provider';
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
     *   sessionInterceptor    → si fue 401 de tenant, logout global
     *   plataformaSession…    → si fue 401 de /api/admin/, cierra el portal
     *   auth/plataforma…      → (solo actúan en la ida: inyectan el Bearer)
     *
     * Los dos pares van juntos porque son la misma mecánica sobre superficies
     * distintas: cada interceptor de ida pone su token solo en las rutas que lo
     * aceptan, y cada uno de vuelta cierra únicamente su propia sesión. Un 401
     * del portal no debe echar al usuario del ERP, ni al revés.
     */
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        plataformaInterceptor,
        sessionInterceptor,
        plataformaSessionInterceptor,
        offlineQueueInterceptor,
        errorInterceptor,
      ]),
    ),

    provideQuery(),
    provideSessionBootstrap(),
    providePlataformaBootstrap(),
    // Las pantallas de entrada van en claro; el tema del usuario entra al pasar
    // al sistema. Ver core/theme/rutas-entrada.ts.
    provideTemaDeEntrada(),
  ],
};
