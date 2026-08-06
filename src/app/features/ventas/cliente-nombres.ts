import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Uuid } from '../../api/models';
import { VentasApi } from '../../api/services/ventas.api';
import { AuthStore } from '../../core/auth/auth.store';
import { qk } from '../../core/query/query-keys';

const PAGE_SIZE_MAXIMO = 100;
const MAX_PAGINAS = 20;

/**
 * Traduce `cliente_id` a la razón social.
 *
 * Todos los listados de Ventas —oportunidades, cotizaciones, pedidos,
 * facturas— devuelven el cliente como UUID y nada más. Sin esto, cuatro tablas
 * enseñarían una columna de identificadores que nadie puede leer.
 *
 * Es el gemelo de `injectCatalogoNombres` de Inventario; comparten la misma
 * cota de páginas y la misma degradación a id corto cuando el catálogo excede
 * el tope.
 */
export function injectClienteNombres() {
  const api = inject(VentasApi);
  const store = inject(AuthStore);

  const clientes = injectQuery(() => {
    const slug = store.tenantSlug() ?? '';
    return {
      queryKey: [...qk.catalogo(slug, 'clientes'), 'nombres'] as const,
      enabled: slug !== '',
      queryFn: async () => {
        const primera = await api.listarClientes({ page: 1, page_size: PAGE_SIZE_MAXIMO });
        const paginas = Math.min(primera.num_pages, MAX_PAGINAS);

        const restantes =
          paginas > 1
            ? await Promise.all(
                Array.from({ length: paginas - 1 }, (_, i) =>
                  api.listarClientes({ page: i + 2, page_size: PAGE_SIZE_MAXIMO }),
                ),
              )
            : [];

        return new Map(
          [primera, ...restantes].flatMap((pagina) =>
            pagina.results.map((c) => [c.id, c.razon_social] as const),
          ),
        );
      },
    };
  });

  return {
    cliente: (id: Uuid) => clientes.data()?.get(id) ?? id.slice(0, 8),
  };
}
