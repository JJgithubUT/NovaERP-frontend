import Dexie from 'dexie';

/**
 * @typedef {import('./outbox.model.js').Entidad} Entidad
 * @typedef {import('./outbox.model.js').OutboxItem} OutboxItem
 */

/**
 * Un registro de catálogo tal como vive en local: el objeto de la API más el
 * tenant al que pertenece y cuándo se sincronizó.
 *
 * @template T
 * @typedef {T & {
 *   tenantSlug: string,
 *   syncedAt: number,
 *   pendiente?: boolean,
 * }} Cacheado
 */

/**
 * IndexedDB de NovaERP: catálogos precargados + outbox de escrituras.
 *
 * Todas las tablas de catálogo llevan clave primaria compuesta
 * `[tenantSlug+id]`. No es un detalle cosmético: es lo que impide que dos
 * tenants abiertos en el mismo navegador se pisen los registros, y lo que
 * permite limpiar un tenant sin tocar al otro.
 */
class NovaDb extends Dexie {
  constructor() {
    super('novaerp');

    this.version(1).stores({
      productos: '[tenantSlug+id], tenantSlug, sku, nombre, activo',
      almacenes: '[tenantSlug+id], tenantSlug, nombre, activo',
      clientes: '[tenantSlug+id], tenantSlug, razon_social, rfc_o_id_fiscal, activo',
      proveedores: '[tenantSlug+id], tenantSlug, razon_social, rfc_o_id_fiscal, activo',
      outbox: 'id, tenantSlug, estado, createdAt, [tenantSlug+estado]',
    });
  }

  /**
   * Resuelve la tabla de un catálogo por su nombre.
   *
   * @param {Entidad} entidad
   */
  tablaDe(entidad) {
    return this[entidad];
  }
}

/**
 * Instancia única. Se crea al importar y no dentro de un componente porque la
 * necesitan tanto la aplicación como el drenado del outbox, que corre fuera del
 * árbol de React.
 */
export const db = new NovaDb();
