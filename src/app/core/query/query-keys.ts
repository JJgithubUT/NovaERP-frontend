import type { Entidad } from '../offline/outbox.model';

/**
 * Todo lo cacheable, no solo lo mutable.
 *
 * `Entidad` (el outbox) son los cuatro catálogos que se pueden escribir sin red.
 * Aquí se suman los recursos de **solo lectura** —vistas SQL y bitácoras— que
 * también se cachean pero nunca se encolan. Mantenerlos en tipos distintos es lo
 * que impide que alguien intente encolar una escritura sobre el kardex, que es
 * inmutable por diseño.
 */
export type Recurso =
  | Entidad
  | 'movimientos'
  | 'ajustes'
  | 'transferencias'
  | 'stock'
  | 'kardex'
  | 'valuacion'
  | 'alertas'
  | 'oportunidades'
  | 'pipeline'
  | 'cotizaciones'
  | 'pedidos'
  | 'facturas'
  | 'ordenes-compra'
  | 'recepciones'
  | 'cuentas-por-pagar'
  | 'config-aprobacion'
  | 'usuarios'
  | 'roles'
  | 'permisos'
  | 'sesiones'
  | 'config-seguridad'
  | 'bitacora'
  | 'actividad';

/**
 * Cualquier objeto de filtros de listado.
 *
 * Es `object` y no `Record<string, unknown>` para que las interfaces concretas
 * (`KardexQuery`, `CatalogQuery`…) encajen: una interfaz sin index signature no
 * es asignable a un Record, aunque sus claves sí sean strings.
 */
export type ListaQuery = object;

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

  catalogo: (tenantSlug: string, recurso: Recurso) => [tenantSlug, recurso] as const,

  lista: (tenantSlug: string, recurso: Recurso, params: ListaQuery = {}) =>
    [tenantSlug, recurso, 'lista', normalizar(params)] as const,

  detalle: (tenantSlug: string, recurso: Recurso, id: string) =>
    [tenantSlug, recurso, 'detalle', id] as const,
} as const;

/**
 * Dos búsquedas equivalentes deben compartir entrada de caché. Sin esto,
 * `{page:1}` y `{page:1,search:''}` serían claves distintas y duplicarían la
 * misma petición.
 */
function normalizar(params: ListaQuery): Record<string, unknown> {
  const entradas = Object.entries(params)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entradas);
}
