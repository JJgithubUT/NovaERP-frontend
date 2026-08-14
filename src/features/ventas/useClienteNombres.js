import { useQuery } from '@tanstack/react-query';
import * as ventasApi from '../../api/services/ventas.api';
import { useTenantSlug } from '../../core/auth/useAuth';
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
 * Trae el catálogo entero de una vez y lo cachea: es una petición por sesión
 * frente a una por fila. La cota de 20 páginas evita que un tenant con 50.000
 * clientes dispare 500 peticiones al abrir una tabla; pasado ese tope los
 * nombres que falten degradan al id corto, que es feo pero no rompe nada.
 */
export function useClienteNombres() {
  const tenantSlug = useTenantSlug() ?? '';

  const clientes = useQuery({
    queryKey: [...qk.catalogo(tenantSlug, 'clientes'), 'nombres'],
    enabled: tenantSlug !== '',
    queryFn: async () => {
      const primera = await ventasApi.listarClientes({ page: 1, page_size: PAGE_SIZE_MAXIMO });
      const paginas = Math.min(primera.num_pages, MAX_PAGINAS);

      const restantes =
        paginas > 1
          ? await Promise.all(
              Array.from({ length: paginas - 1 }, (_, i) =>
                ventasApi.listarClientes({ page: i + 2, page_size: PAGE_SIZE_MAXIMO }),
              ),
            )
          : [];

      return new Map(
        [primera, ...restantes].flatMap((pagina) =>
          pagina.results.map((c) => [c.id, c.razon_social]),
        ),
      );
    },
  });

  return {
    /** @param {string} id */
    cliente: (id) => clientes.data?.get(id) ?? id.slice(0, 8),
  };
}
