/**
 * Tipos comunes a todo el contrato de la API. Espejo manual de
 * `docs/v1.0_Sprint-1_Fase-1_15-7-2026/openapi.yaml`.
 */

export type Uuid = string;

/**
 * Campo decimal. El backend lo manda como string a propósito para no perder
 * precisión en el punto flotante de JSON. Nunca lo pases por `parseFloat`:
 * usa los helpers de `shared/utils/decimal.util.ts`.
 */
export type DecimalString = string;

/** Sobre que devuelve todo endpoint de listado. */
export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: T[];
}

/**
 * Parámetros aceptados por todos los listados de catálogo.
 * `page_size` se ajusta silenciosamente a [1, 100] del lado del backend.
 */
export interface CatalogQuery {
  page?: number;
  page_size?: number;
  search?: string;
  activo?: boolean;
}

/** Respuesta de todo DELETE. La baja es lógica: el registro nunca se borra. */
export interface BajaResponse {
  id: Uuid;
  activo: false;
}

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
