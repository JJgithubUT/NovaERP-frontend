import type { CatalogQuery } from '../../api/models';
import type { Entidad } from '../offline/outbox.model';

/**
 * Fábrica única de claves de caché.
 *
 * Todas las claves arrancan con el `tenantSlug`. Eso hace que cambiar de tenant
 * invalide todo por construcción, en vez de depender de acordarse de limpiar la
 * caché a mano.
 *
 * La jerarquía es intencional: `['acme','productos']` es prefijo de
 * `['acme','productos','lista',{...}]`, así que invalidar el catálogo entero
 * tras una mutación es `invalidateQueries({ queryKey: qk.catalogo(slug,'productos') })`
 * y arrastra todas las páginas y filtros de golpe.
 */
export const qk = {
  tenant: (tenantSlug: string) => [tenantSlug] as const,

  me: (tenantSlug: string) => [tenantSlug, 'me'] as const,

  catalogo: (tenantSlug: string, entidad: Entidad) => [tenantSlug, entidad] as const,

  lista: (tenantSlug: string, entidad: Entidad, params: CatalogQuery = {}) =>
    [tenantSlug, entidad, 'lista', normalizar(params)] as const,

  detalle: (tenantSlug: string, entidad: Entidad, id: string) =>
    [tenantSlug, entidad, 'detalle', id] as const,
} as const;

/**
 * Dos búsquedas equivalentes deben compartir entrada de caché. Sin esto,
 * `{page:1}` y `{page:1,search:''}` serían claves distintas y duplicarían la
 * misma petición.
 */
function normalizar(params: CatalogQuery): Record<string, unknown> {
  const entradas = Object.entries(params)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entradas);
}
