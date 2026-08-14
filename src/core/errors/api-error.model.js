/**
 * Tipo único de error que ve toda la app (Flujo 5).
 *
 * El backend habla dos dialectos de error a propósito (documentado en el
 * openapi.yaml): `/api/auth/login/` responde `{ mensaje }` y todo lo demás
 * responde `{ detail, campo? }`. Nada arriba de `normalize-error.ts` debería
 * saber eso: los componentes consumen siempre este `ApiError`.
 */
/**
 * Forma del error normalizado:
 *
 * - `kind` — 'network' | 'auth' | 'not_found' | 'bad_request' | 'business' |
 *   'server' | 'unknown'.
 * - `status` — código HTTP; `0` cuando la petición nunca salió a la red.
 * - `message` — texto ya redactado, listo para mostrar.
 * - `field` — campo del formulario en conflicto (el `campo` de un 422).
 * - `extra` — resto del cuerpo del error (`saldo_pendiente`, `disponible`,
 *   `modulos_afectados`…).
 * - `queued` — la petición se guardó en el outbox y se reintentará.
 * - `url` y `metodo` — de la petición que falló.
 *
 * Lo de arrastrar `url`/`metodo` no es redundante con axios: los interceptores
 * de respuesta corren **después** de normalizar, y para entonces el
 * `AxiosError` original —con su `config`— ya no existe. Sin ellos, el vigilante
 * de 401 no puede distinguir una contraseña mala en `/api/auth/login/` de una
 * sesión expirada, y cerraría la sesión en ambos casos.
 */
const API_ERROR_BRAND = Symbol.for('novaerp.ApiError');
export function createApiError(error) {
  return { ...error, [API_ERROR_BRAND]: true };
}
export function isApiError(value) {
  return typeof value === 'object' && value !== null && API_ERROR_BRAND in value;
}
