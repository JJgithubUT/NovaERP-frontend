import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { normalizeError } from '../errors/normalize-error';

/**
 * Traduce todo error HTTP al `ApiError` único de la app (Flujo 5).
 *
 * Va al final de la cadena a propósito: como las respuestas se procesan en
 * orden inverso al de registro, este corre primero de vuelta y todos los demás
 * interceptores reciben el error ya normalizado.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => normalizeError(error))));
