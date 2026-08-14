import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { Big, formatCantidad, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { FiltrosStock } from '../FiltrosStock';

const COLUMNAS = 6;

/**
 * Valuación del inventario a costo de referencia.
 *
 * Dos advertencias que conviene tener presentes al leer la cifra:
 *
 * - Valúa a **`costo_referencia` del producto**, no al costo real de cada
 *   entrada. No es un costeo PEPS ni promedio ponderado; cambiar el costo de
 *   referencia de un producto revalúa todo su inventario al instante.
 * - El total del pie suma **solo la página en pantalla**, no el inventario
 *   entero. El backend no devuelve un gran total y calcularlo aquí exigiría
 *   traer todas las páginas; se rotula como parcial en vez de mentir.
 */
export function ValuacionPage() {
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
    queryKey: qk.lista(tenantSlug, 'valuacion', filtros),
    queryFn: () => inventarioApi.listarValuacion(filtros),
  });

  const filas = consulta.data?.results ?? [];

  const totalPagina = filas.reduce(
    (suma, fila) => suma.plus(toDecimal(fila.valor_total)),
    new Big(0),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Valuación</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            A costo de referencia del producto, no al costo real de cada entrada.
          </p>
        </div>

        {filas.length > 0 ? (
          <div className="text-right">
            <p className="text-label-caps uppercase text-on-surface-variant">Total en pantalla</p>
            <p className="font-mono text-xl font-bold tabular-nums text-on-surface">
              {formatMoneda(totalPagina.toString())}
            </p>
          </div>
        ) : null}
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
              <th className="num">Costo ref.</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin inventario que valuar con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={`${fila.sku}-${fila.almacen}`}>
                    <td className="clave">{fila.sku}</td>
                    <td className="font-medium">{fila.producto}</td>
                    <td className="tenue">{fila.almacen}</td>
                    <td className="num">{formatCantidad(fila.cantidad)}</td>
                    <td className="num tenue">{formatMoneda(fila.costo_referencia)}</td>
                    <td className="num font-semibold">{formatMoneda(fila.valor_total)}</td>
                  </tr>
                ))
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
