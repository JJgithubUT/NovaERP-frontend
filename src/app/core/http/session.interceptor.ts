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
 */
const RUTAS_SIN_SESION = ['/api/auth/login/', '/api/auth/otp/'];

export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const esSesionExpirada =
        isApiError(error) &&
        error.kind === 'auth' &&
        !RUTAS_SIN_SESION.some((ruta) => req.url.includes(ruta));

      if (esSesionExpirada) {
        // Sin await: no queremos retrasar la propagación del error al caller.
        void auth.logout();
      }

      return throwError(() => error);
    }),
  );
};
