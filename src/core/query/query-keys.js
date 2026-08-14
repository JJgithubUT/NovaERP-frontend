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
  tenant: (tenantSlug) => [tenantSlug],
  me: (tenantSlug) => [tenantSlug, 'me'],
  catalogo: (tenantSlug, recurso) => [tenantSlug, recurso],
  lista: (tenantSlug, recurso, params = {}) => [tenantSlug, recurso, 'lista', normalizar(params)],
  detalle: (tenantSlug, recurso, id) => [tenantSlug, recurso, 'detalle', id],
};
/**
 * Dos búsquedas equivalentes deben compartir entrada de caché. Sin esto,
 * `{page:1}` y `{page:1,search:''}` serían claves distintas y duplicarían la
 * misma petición.
 */
function normalizar(params) {
  const entradas = Object.entries(params)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entradas);
}
