import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Almacen, Cliente, Producto, Proveedor } from '../../api/models';
import type { Entidad, OutboxItem } from './outbox.model';

/**
 * Un registro de catálogo tal como vive en local: el objeto de la API más el
 * tenant al que pertenece y cuándo se sincronizó.
 */
export type Cacheado<T> = T & {
  tenantSlug: string;
  /** Epoch ms del último sync con el backend. Sirve para mostrar "datos de…". */
  syncedAt: number;
  /**
   * El registro nació de una mutación optimista y todavía no lo confirma el
   * backend. La UI lo marca como "pendiente de sincronizar".
   */
  pendiente?: boolean;
};

/**
 * IndexedDB de NovaERP: catálogos precargados + outbox de escrituras.
 *
 * Todas las tablas de catálogo llevan clave primaria compuesta
 * `[tenantSlug+id]`. No es un detalle cosmético: es lo que impide que dos
 * tenants abiertos en el mismo navegador se pisen los registros, y lo que
 * permite limpiar un tenant sin tocar al otro.
 */
/** Clave primaria compuesta de las tablas de catálogo: `[tenantSlug, id]`. */
export type ClaveCatalogo = [string, string];

export class NovaDb extends Dexie {
  // Los catálogos usan `Table` y no `EntityTable`: su clave es compuesta y la
  // asigna el servidor, no es un `id` autoincremental que Dexie deba generar.
  declare productos: Table<Cacheado<Producto>, ClaveCatalogo>;
  declare almacenes: Table<Cacheado<Almacen>, ClaveCatalogo>;
  declare clientes: Table<Cacheado<Cliente>, ClaveCatalogo>;
  declare proveedores: Table<Cacheado<Proveedor>, ClaveCatalogo>;

  // El outbox sí tiene `id` simple: lo genera el cliente al encolar.
  declare outbox: EntityTable<OutboxItem, 'id'>;

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
   * Este cast es **el único del proyecto sobre el esquema**, y es deliberado:
   * elegir tabla por un string en runtime es algo que el sistema de tipos no
   * puede verificar. A cambio, queda encapsulado aquí y `CatalogCacheService`
   * expone una API genérica y tipada por encima, sin castear nada.
   *
   * El contrato que el llamador debe respetar —y que el compilador no puede
   * imponer— es que `T` corresponda a `entidad`: `tablaDe<Cliente>('clientes')`.
   */
  tablaDe<T extends CatalogoRecord>(entidad: Entidad): Table<Cacheado<T>, ClaveCatalogo> {
    return this[entidad] as unknown as Table<Cacheado<T>, ClaveCatalogo>;
  }
}

export type CatalogoRecord = Producto | Almacen | Cliente | Proveedor;

/**
 * Instancia única. Se crea al importar en vez de vía DI porque el Service
 * Worker —que no tiene inyector de Angular— necesita el mismo esquema.
 */
export const db = new NovaDb();
