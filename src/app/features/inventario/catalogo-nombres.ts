import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Paginated, Uuid } from '../../api/models';
import { InventarioApi } from '../../api/services/inventario.api';
import { AuthStore } from '../../core/auth/auth.store';
import { qk } from '../../core/query/query-keys';

/** Tope del backend. Pedir más se recorta en silencio. */
const PAGE_SIZE_MAXIMO = 100;

/**
 * Cota de seguridad: 20 páginas × 100 = 2.000 registros.
 *
 * Sin ella, un catálogo grande convertiría lo que debería ser una ayuda visual
 * en una cascada de decenas de peticiones cada vez que se abre una pestaña.
 * Pasado el tope se deja de traducir y se muestra el id corto, que es
 * degradar, no romper.
 */
const MAX_PAGINAS = 20;

/**
 * Traduce los UUID de `producto_id` / `almacen_id` a algo legible.
 *
 * Hace falta porque cuatro endpoints de Inventario —movimientos, ajustes,
 * transferencias y alertas— devuelven **solo los ids**, no los nombres. Las
 * vistas SQL (stock, kardex, valuación) sí traen la clave natural, pero las
 * tablas transaccionales no. Enseñar un UUID crudo en pantalla, como hacía la
 * versión React, es enseñar algo que nadie puede interpretar.
 *
 * Se apoya en la caché de TanStack: los combos de búsqueda ya piden estos
 * mismos catálogos, así que en la práctica suele resolverse sin red.
 */
export function injectCatalogoNombres() {
  const api = inject(InventarioApi);
  const store = inject(AuthStore);

  const productos = injectQuery(() => {
    const slug = store.tenantSlug() ?? '';
    return {
      queryKey: [...qk.catalogo(slug, 'productos'), 'nombres'] as const,
      enabled: slug !== '',
      queryFn: () =>
        traerTodo((page) => api.listarProductos({ page, page_size: PAGE_SIZE_MAXIMO })).then(
          (lista) => new Map(lista.map((p) => [p.id, `${p.sku} — ${p.nombre}`])),
        ),
    };
  });

  const almacenes = injectQuery(() => {
    const slug = store.tenantSlug() ?? '';
    return {
      queryKey: [...qk.catalogo(slug, 'almacenes'), 'nombres'] as const,
      enabled: slug !== '',
      queryFn: () =>
        traerTodo((page) => api.listarAlmacenes({ page, page_size: PAGE_SIZE_MAXIMO })).then(
          (lista) => new Map(lista.map((a) => [a.id, a.nombre])),
        ),
    };
  });

  return {
    /** Nombre del producto, o el id abreviado si aún no se ha resuelto. */
    producto: (id: Uuid) => productos.data()?.get(id) ?? idCorto(id),
    almacen: (id: Uuid) => almacenes.data()?.get(id) ?? idCorto(id),
  };
}

/**
 * Recorre la paginación hasta agotarla. Se pide la primera página para saber
 * cuántas hay y luego el resto en paralelo: en serie, un catálogo de 2.000
 * registros encadenaría veinte viajes de ida y vuelta.
 */
async function traerTodo<T>(pedir: (page: number) => Promise<Paginated<T>>): Promise<T[]> {
  const primera = await pedir(1);
  const paginas = Math.min(primera.num_pages, MAX_PAGINAS);
  if (paginas <= 1) return primera.results;

  const restantes = await Promise.all(Array.from({ length: paginas - 1 }, (_, i) => pedir(i + 2)));

  return [primera, ...restantes].flatMap((pagina) => pagina.results);
}

/** Un UUID entero no cabe en una celda; los ocho primeros bastan para cotejar. */
function idCorto(id: Uuid): string {
  return id.slice(0, 8);
}
