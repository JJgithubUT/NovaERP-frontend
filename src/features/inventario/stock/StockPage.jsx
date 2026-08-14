import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { formatCantidad, toDecimal } from '../../../shared/utils/decimal.util';
import { FiltrosStock } from '../FiltrosStock';

const COLUMNAS = 6;

/**
 * Existencia por producto y almacén.
 *
 * La columna que importa es **disponible** (`cantidad − reservado`), no
 * `cantidad`: lo reservado ya está comprometido con pedidos confirmados y no se
 * puede vender otra vez. Enseñar solo la cantidad total llevaría a prometer
 * mercancía que ya tiene dueño.
 *
 * Es una vista SQL: no hay nada que editar aquí. El stock se mueve con
 * movimientos, ajustes y transferencias.
 */
export function StockPage() {
  const tenantSlug = useTenantSlug() ?? '';

  const [pagina, setPagina] = useState(1);
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    producto_id: producto?.id,
    almacen_id: almacen?.id,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'stock', filtros),
    queryFn: () => inventarioApi.listarStock(filtros),
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-headline-sm text-on-surface">Stock disponible</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          «Disponible» descuenta lo reservado por pedidos confirmados: es lo que de verdad se puede
          comprometer.
        </p>
      </div>

      <FiltrosStock
        producto={producto}
        almacen={almacen}
        onProducto={(v) => {
          setProducto(v);
          setPagina(1);
        }}
        onAlmacen={(v) => {
          setAlmacen(v);
          setPagina(1);
        }}
      />

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th className="num">Cantidad</th>
              <th className="num">Reservado</th>
              <th className="num">Disponible</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin existencias con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => {
                  // Sin disponible no hay nada que vender: se marca en rojo
                  // porque es la lectura accionable de esta tabla.
                  const agotado = toDecimal(fila.disponible).lte(0);

                  return (
                    <tr key={`${fila.sku}-${fila.almacen}`}>
                      <td className="clave">{fila.sku}</td>
                      <td className="font-medium">{fila.producto}</td>
                      <td className="tenue">{fila.almacen}</td>
                      <td className="num">{formatCantidad(fila.cantidad)}</td>
                      <td className="num tenue">{formatCantidad(fila.reservado)}</td>
                      <td className={`num font-semibold ${agotado ? 'text-error' : ''}`}>
                        {formatCantidad(fila.disponible)}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>

        <Paginacion
          page={pagina}
          count={consulta.data?.count ?? 0}
          numPages={consulta.data?.num_pages ?? 1}
          onPage={setPagina}
        />
      </div>
    </div>
  );
}
