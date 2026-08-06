import { HttpErrorResponse } from '@angular/common/http';
import {
  createApiError,
  isApiError,
  type ApiError,
  type ApiErrorKind,
  type BrandedApiError,
} from './api-error.model';

const MENSAJE_POR_DEFECTO: Record<ApiErrorKind, string> = {
  network: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  auth: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  not_found: 'No encontrado.',
  bad_request: 'La solicitud no es válida.',
  business: 'No se pudo completar la operación.',
  server: 'El servidor tuvo un problema. Inténtalo más tarde.',
  unknown: 'Ocurrió un error inesperado.',
};

function kindDeStatus(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 400) return 'bad_request';
  if (status === 422) return 'business';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * El cuerpo del error puede llegar como objeto ya parseado, como string sin
 * parsear (pasa cuando el backend manda 500 con HTML, o cuando el
 * `responseType` no era json) o como ProgressEvent en fallos de red.
 */
function comoObjeto(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object' && body !== null && !(body instanceof ProgressEvent)) {
    return body as Record<string, unknown>;
  }
  return null;
}

function textoDe(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Convierte cualquier cosa que se pueda lanzar en la capa HTTP en un `ApiError`.
 * Es la única función de la app que conoce los dos dialectos de error del
 * backend (`mensaje` y `detail`).
 */
export function normalizeError(error: unknown): BrandedApiError {
  // Ya normalizado (p.ej. re-lanzado por otro interceptor): no lo toques.
  if (isApiError(error)) {
    return createApiError(error);
  }

  if (!(error instanceof HttpErrorResponse)) {
    const message = error instanceof Error ? error.message : MENSAJE_POR_DEFECTO.unknown;
    return createApiError({ kind: 'unknown', status: 0, message, extra: {} });
  }

  const kind = kindDeStatus(error.status);
  const body = comoObjeto(error.error);

  if (!body) {
    return createApiError({
      kind,
      status: error.status,
      message: MENSAJE_POR_DEFECTO[kind],
      extra: {},
    });
  }

  // Los dos dialectos. `detail` gana si por alguna razón vinieran ambos.
  const { detail, mensaje, campo, ...extra } = body;
  const message = textoDe(detail) ?? textoDe(mensaje) ?? MENSAJE_POR_DEFECTO[kind];

  const normalized: ApiError = {
    kind,
    status: error.status,
    message,
    extra,
  };

  const field = textoDe(campo);
  return createApiError(field ? { ...normalized, field } : normalized);
}
