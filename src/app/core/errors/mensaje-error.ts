import { isApiError } from './api-error.model';

/**
 * Texto que se le enseña al usuario cuando algo falla.
 *
 * Todo lo que pasa por los interceptores ya llega como `ApiError` con un
 * mensaje redactado. Esto solo cubre el resto: un fallo dentro del propio
 * componente, un `throw` de una librería. Nunca se enseña un stack trace ni el
 * `toString()` de un objeto cualquiera.
 */
export function mensajeDeError(error: unknown, respaldo = 'Ocurrió un error inesperado.'): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return respaldo;
}

/**
 * Campo señalado por un 422, si lo hay.
 *
 * El backend manda `campo` en los errores de regla de negocio (`sku ya
 * existe`), y el formulario lo usa para marcar ese control en vez de soltar un
 * banner genérico que obliga a adivinar cuál de los seis campos falló.
 */
export function campoDeError(error: unknown): string | null {
  return isApiError(error) ? (error.field ?? null) : null;
}
