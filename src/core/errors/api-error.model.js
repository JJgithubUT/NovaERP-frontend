/**
 * Tipo único de error que ve toda la app (Flujo 5).
 *
 * El backend habla dos dialectos de error a propósito (documentado en el
 * openapi.yaml): `/api/auth/login/` responde `{ mensaje }` y todo lo demás
 * responde `{ detail, campo? }`. Nada arriba de `normalize-error.ts` debería
 * saber eso: los componentes consumen siempre este `ApiError`.
 */
const API_ERROR_BRAND = Symbol.for('novaerp.ApiError');
export function createApiError(error) {
  return { ...error, [API_ERROR_BRAND]: true };
}
export function isApiError(value) {
  return typeof value === 'object' && value !== null && API_ERROR_BRAND in value;
}
