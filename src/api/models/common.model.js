/**
 * Tipos comunes a todo el contrato de la API. Espejo manual de
 * `docs/v1.0_Sprint-1_Fase-1_15-7-2026/openapi.yaml`.
 */

/**
 * @typedef {string} Uuid
 */

/**
 * Campo decimal. El backend lo manda como string a propósito para no perder
 * precisión en el punto flotante de JSON. Nunca lo pases por `parseFloat`:
 * usa los helpers de `shared/utils/decimal.util.ts`.
 *
 * @typedef {string} DecimalString
 */

/**
 * Sobre que devuelve todo endpoint de listado.
 *
 * @template T
 * @typedef {object} Paginated
 * @property {number} count
 * @property {number} page
 * @property {number} page_size
 * @property {number} num_pages
 * @property {T[]} results
 */

/**
 * Parámetros aceptados por todos los listados de catálogo.
 * `page_size` se ajusta silenciosamente a [1, 100] del lado del backend.
 *
 * @typedef {object} CatalogQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [search]
 * @property {boolean} [activo]
 */

/**
 * Respuesta de todo DELETE. La baja es lógica: el registro nunca se borra.
 *
 * @typedef {object} BajaResponse
 * @property {Uuid} id
 * @property {false} activo
 */

export const PAGE_SIZE_DEFAULT = 20;

export const PAGE_SIZE_MAX = 100;
