import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isApiError } from '../errors/api-error.model';
import { AuthService } from '../auth/auth.service';

/**
 * Vigila los 401 y dispara el logout global.
 *
 * El backend no tiene refresh token: un 401 es terminal, no hay nada que
 * reintentar. Solo queda limpiar la sesión y mandar al usuario a /login.
 *
 * Un 401 en el propio login o en el OTP no es una sesión expirada sino
 * credenciales/código malos: ahí no hay que hacer logout, el formulario ya
 * muestra el mensaje.
 *
 * `/api/auth/logout/` está en la lista por una razón distinta y más delicada:
 * es la petición que `AuthService.logout()` hace para revocar la sesión en el
 * servidor. Si respondiera 401 (token ya caducado, sesión revocada desde otro
 * dispositivo) y la tratáramos como sesión expirada, llamaríamos a `logout()`
 * desde dentro de `logout()` — recursión infinita. Además sería redundante:
 * quien la disparó ya está cerrando la sesión.
 */
const RUTAS_SIN_SESION = ['/api/auth/login/', '/api/auth/otp/', '/api/auth/logout/'];

/**
 * La superficie de plataforma tiene su propia sesión y su propio interceptor de
 * 401 (`plataformaSessionInterceptor`). Un 401 ahí no dice nada sobre la sesión
 * de tenant: tratarlo como tal echaría del ERP a un usuario por el simple hecho
 * de tener abierta la pestaña del portal con un token vencido.
 */
const PREFIJO_PLATAFORMA = '/api/admin/';

export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const esSesionExpirada =
        isApiError(error) &&
        error.kind === 'auth' &&
        !req.url.includes(PREFIJO_PLATAFORMA) &&
        !RUTAS_SIN_SESION.some((ruta) => req.url.includes(ruta));

      if (esSesionExpirada) {
        // Sin await: no queremos retrasar la propagación del error al caller.
        // Sin revocar: el 401 significa que el backend ya dio la sesión por
        // cerrada, así que no hay nada que revocar.
        void auth.logout({ revocar: false });
      }

      return throwError(() => error);
    }),
  );
};
