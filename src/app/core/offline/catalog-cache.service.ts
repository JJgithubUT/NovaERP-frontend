import { Injectable, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { db, type Cacheado, type CatalogoRecord } from './nova-db';
import type { Entidad } from './outbox.model';

/**
 * Espejo local de los catálogos en IndexedDB.
 *
 * El contrato con la capa de datos es: online, las queries van a la API y de
 * paso guardan aquí; offline, leen de aquí. La pantalla no cambia — solo la
 * procedencia de los datos y el aviso de "última sincronización".
 *
 * Todo método filtra por el tenant del token. Un registro de otro tenant no es
 * inalcanzable por accidente: es inalcanzable por construcción, porque el
 * tenant forma parte de la clave primaria.
 */
@Injectable({ providedIn: 'root' })
export class CatalogCacheService {
  private readonly authStore = inject(AuthStore);

  /** Guarda una página recién traída de la API. */
  async guardar<T extends CatalogoRecord>(
    entidad: Entidad,
    registros: readonly T[],
  ): Promise<void> {
    const tenantSlug = this.tenantOrThrow();
    const syncedAt = Date.now();

    await db
      .tablaDe<T>(entidad)
      .bulkPut(registros.map((registro) => ({ ...registro, tenantSlug, syncedAt })));
  }

  /** Lee el catálogo local. Es lo que alimenta las pantallas sin red. */
  async leerTodos<T extends CatalogoRecord>(entidad: Entidad): Promise<Array<Cacheado<T>>> {
    const tenantSlug = this.tenantOrThrow();
    return await db.tablaDe<T>(entidad).where('tenantSlug').equals(tenantSlug).toArray();
  }

  async leerUno<T extends CatalogoRecord>(
    entidad: Entidad,
    id: string,
  ): Promise<Cacheado<T> | undefined> {
    const tenantSlug = this.tenantOrThrow();
    return await db.tablaDe<T>(entidad).get([tenantSlug, id]);
  }

  /**
   * Inserta un registro creado offline, marcado como pendiente. Su `id` es
   * temporal hasta que el POST sincronice y el backend asigne el UUID real.
   */
  async guardarPendiente<T extends CatalogoRecord>(entidad: Entidad, registro: T): Promise<void> {
    const tenantSlug = this.tenantOrThrow();
    await db
      .tablaDe<T>(entidad)
      .put({ ...registro, tenantSlug, syncedAt: Date.now(), pendiente: true });
  }

  async eliminar(entidad: Entidad, id: string): Promise<void> {
    const tenantSlug = this.tenantOrThrow();
    await db.tablaDe(entidad).delete([tenantSlug, id]);
  }

  /**
   * Borra los datos del tenant activo sin tocar los de otros tenants ni el
   * outbox — el trabajo pendiente del usuario no se descarta nunca en silencio.
   */
  async limpiarTenant(): Promise<void> {
    const tenantSlug = this.tenantOrThrow();
    const entidades: readonly Entidad[] = ['productos', 'almacenes', 'clientes', 'proveedores'];

    await Promise.all(
      entidades.map((entidad) =>
        db.tablaDe(entidad).where('tenantSlug').equals(tenantSlug).delete(),
      ),
    );
  }

  private tenantOrThrow(): string {
    const tenantSlug = this.authStore.tenantSlug();
    if (!tenantSlug) {
      throw new Error('No hay tenant activo: no se puede tocar la caché de catálogos.');
    }
    return tenantSlug;
  }
}
