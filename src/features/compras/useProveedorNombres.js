import { useQuery } from '@tanstack/react-query';
import * as comprasApi from '../../api/services/compras.api';
import { useTenantSlug } from '../../core/auth/useAuth';
import { qk } from '../../core/query/query-keys';

const PAGE_SIZE_MAXIMO = 100;
const MAX_PAGINAS = 20;

/**
 * Traduce `proveedor_id` a la razón social.
 *
 * Las órdenes, recepciones y cuentas por pagar devuelven el proveedor como UUID
 * y nada más. Es el gemelo de `useClienteNombres` de Ventas, con la misma cota
 * de páginas y la misma degradación al id corto cuando el catálogo la excede.
 */
export function useProveedorNombres() {
  const tenantSlug = useTenantSlug() ?? '';

  const proveedores = useQuery({
    queryKey: [...qk.catalogo(tenantSlug, 'proveedores'), 'nombres'],
    enabled: tenantSlug !== '',
    queryFn: async () => {
      const primera = await comprasApi.listarProveedores({ page: 1, page_size: PAGE_SIZE_MAXIMO });
      const paginas = Math.min(primera.num_pages, MAX_PAGINAS);

      const restantes =
        paginas > 1
          ? await Promise.all(
              Array.from({ length: paginas - 1 }, (_, i) =>
                comprasApi.listarProveedores({ page: i + 2, page_size: PAGE_SIZE_MAXIMO }),
              ),
            )
          : [];

      return new Map(
        [primera, ...restantes].flatMap((pagina) =>
          pagina.results.map((p) => [p.id, p.razon_social]),
        ),
      );
    },
  });

  return {
    /** @param {string} id */
    proveedor: (id) => proveedores.data?.get(id) ?? id.slice(0, 8),
  };
}
