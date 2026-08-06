/**
 * Tipo único de error que ve toda la app (Flujo 5).
 *
 * El backend habla dos dialectos de error a propósito (documentado en el
 * openapi.yaml): `/api/auth/login/` responde `{ mensaje }` y todo lo demás
 * responde `{ detail, campo? }`. Nada arriba de `normalize-error.ts` debería
 * saber eso: los componentes consumen siempre este `ApiError`.
 */

export type ApiErrorKind =
  /** La petición nunca llegó al servidor: sin red, DNS, CORS, timeout. */
  | 'network'
  /** 401. El interceptor de sesión ya disparó el logout global. */
  | 'auth'
  /** 404. Incluye recursos de otro tenant: el backend no confirma existencia. */
  | 'not_found'
  /** 400. JSON inválido o faltan campos obligatorios. */
  | 'bad_request'
  /** 422. Regla de negocio violada; suele traer `field`. */
  | 'business'
  /** 5xx. */
  | 'server'
  | 'unknown';

export interface ApiError {
  readonly kind: ApiErrorKind;
  /** Código HTTP. `0` cuando la petición nunca salió a la red. */
  readonly status: number;
  /** Mensaje ya normalizado, listo para mostrar. */
  readonly message: string;
  /**
   * Campo del formulario en conflicto (`campo` del 422). Los formularios lo
   * usan para marcar el control exacto en vez de un banner genérico.
   */
  readonly field?: string;
  /**
   * Resto del cuerpo del error. Las reglas de negocio específicas mandan datos
   * extra aquí — p.ej. `saldo_pendiente` al intentar dar de baja un cliente
   * con CxC abiertas.
   */
  readonly extra: Readonly<Record<string, unknown>>;
  /** La petición se guardó en el outbox y se reintentará al volver la red. */
  readonly queued?: boolean;
}

const API_ERROR_BRAND = Symbol.for('novaerp.ApiError');

/** Marca interna: distingue un ApiError de cualquier otro objeto. */
export interface BrandedApiError extends ApiError {
  readonly [API_ERROR_BRAND]: true;
}

export function createApiError(error: ApiError): BrandedApiError {
  return { ...error, [API_ERROR_BRAND]: true };
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && API_ERROR_BRAND in value;
}
