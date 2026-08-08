import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isApiError } from '../errors/api-error.model';
import { PlataformaService } from '../plataforma/plataforma.service';

const PREFIJO_PLATAFORMA = '/api/admin/';

/**
 * `login/` responde 401 con credenciales incorrectas, no con sesión expirada: el
 * formulario ya muestra el mensaje. `logout/` está por la razón más delicada —es
 * la petición que hace `salir()`, y tratar su 401 como sesión expirada llamaría
 * a `salir()` desde dentro de `salir()`.
 */
const RUTAS_SIN_SESION = ['/api/admin/login/', '/api/admin/logout/'];

/**
 * Gemelo de `sessionInterceptor` para el portal de plataforma: vigila los 401 de
 * `/api/admin/*` y cierra **esa** sesión, sin tocar la del tenant.
 *
 * Aquí un 401 puede significar tres cosas, y las tres terminan igual: el token
 * venció, la sesión se revocó, o la cuenta del SysAdmin se desactivó —el backend
 * exige `sysadmin.activo` al validar la sesión, así que desactivar una cuenta
 * también tumba las sesiones que ya tenía emitidas. No hay refresh token: el 401
 * es terminal y lo único que queda es volver al acceso.
 */
export const plataformaSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const plataforma = inject(PlataformaService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const esSesionExpirada =
        isApiError(error) &&
        error.kind === 'auth' &&
        req.url.includes(PREFIJO_PLATAFORMA) &&
        !RUTAS_SIN_SESION.some((ruta) => req.url.includes(ruta));

      if (esSesionExpirada) {
        // Sin await para no retrasar la propagación del error al caller, y sin
        // revocar: el backend ya dio la sesión por cerrada.
        void plataforma.salir({ revocar: false });
      }

      return throwError(() => error);
    }),
  );
};
