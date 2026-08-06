import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Uuid } from '../../api/models';
import { ComprasApi } from '../../api/services/compras.api';
import { AuthStore } from '../../core/auth/auth.store';
import { qk } from '../../core/query/query-keys';

const PAGE_SIZE_MAXIMO = 100;
const MAX_PAGINAS = 20;

/**
 * Traduce `proveedor_id` a la razón social.
 *
 * Órdenes y cuentas por pagar devuelven el proveedor como UUID. Es el gemelo de
 * `injectClienteNombres` de Ventas, con la misma cota de páginas y la misma
 * degradación al id corto si el catálogo la excede.
 */
export function injectProveedorNombres() {
  const api = inject(ComprasApi);
  const store = inject(AuthStore);

  const proveedores = injectQuery(() => {
    const slug = store.tenantSlug() ?? '';
    return {
      queryKey: [...qk.catalogo(slug, 'proveedores'), 'nombres'] as const,
      enabled: slug !== '',
      queryFn: async () => {
        const primera = await api.listarProveedores({ page: 1, page_size: PAGE_SIZE_MAXIMO });
        const paginas = Math.min(primera.num_pages, MAX_PAGINAS);

        const restantes =
          paginas > 1
            ? await Promise.all(
                Array.from({ length: paginas - 1 }, (_, i) =>
                  api.listarProveedores({ page: i + 2, page_size: PAGE_SIZE_MAXIMO }),
                ),
              )
            : [];

        return new Map(
          [primera, ...restantes].flatMap((pagina) =>
            pagina.results.map((p) => [p.id, p.razon_social] as const),
          ),
        );
      },
    };
  });

  return {
    proveedor: (id: Uuid) => proveedores.data()?.get(id) ?? id.slice(0, 8),
  };
}
