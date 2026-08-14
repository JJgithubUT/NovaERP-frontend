import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, rankingProductos } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { formatPorcentaje, rangoPorDefecto, useExportacion } from './useReporte';

const COLUMNAS = 6;

/**
 * RV-03 · Ranking de productos.
 *
 * Este es el reporte con la salvedad metodológica más importante, y el backend
 * la manda en `nota`: el importe es **bruto**, sin descontar notas de crédito,
 * porque una nota no tiene desglose por línea y no se puede repartir entre
 * productos. Comparar esta cifra con la venta neta de otros reportes dará
 * distinto, y no es un error de cuadre.
 */
export function RankingProductosPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const inicial = rangoPorDefecto();

  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [orden, setOrden] = useState('monto');
  const [limit, setLimit] = useState('10');
  const [query, setQuery] = useState({ ...inicial, orden: 'monto', limit: 10 });

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-productos', query),
    queryFn: () => rankingProductos(query),
  });

  const { exportando, exportar } = useExportacion(RUTAS_REPORTE.productos, 'ranking-productos');

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Ranking de productos"
        descripcion="Qué se vende más, por importe o por cantidad."
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
        cargando={consulta.isFetching}
        exportando={exportando}
        nota={datos?.nota}
        alcanceVendedor={datos?.alcance_vendedor ?? null}
        generadoEn={datos?.generado_en}
        onBuscar={() => setQuery({ desde, hasta, orden, limit: Number(limit) || 10 })}
        onExportar={(formato) => exportar(query, formato)}
      >
        <div className="campo">
          <label className="text-label-caps uppercase text-on-surface-variant" htmlFor="orden">
            Ordenar por
          </label>
          <select
            id="orden"
            className="campo-control"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="monto">Importe</option>
            <option value="cantidad">Cantidad</option>
          </select>
        </div>

        <div className="campo">
          <label className="text-label-caps uppercase text-on-surface-variant" htmlFor="limit">
            Mostrar
          </label>
          <input
            id="limit"
            type="number"
            min={1}
            max={100}
            className="campo-control w-24"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
      </ReporteHeader>

      {totales ? (
        <TotalesReporte
          items={[
            { etiqueta: 'Importe bruto', valor: formatMoneda(totales.importe), destacado: true },
            { etiqueta: 'Cantidad', valor: formatCantidad(totales.cantidad) },
            { etiqueta: 'Productos', valor: String(totales.num_productos) },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>SKU</th>
              <th>Producto</th>
              <th className="num">Cantidad</th>
              <th className="num">Importe</th>
              <th className="num">Participación</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin productos vendidos en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila, indice) => (
                  <tr key={fila.producto_id}>
                    <td className="num tenue">{indice + 1}</td>
                    <td className="clave">{fila.sku}</td>
                    <td className="font-medium">
                      {fila.nombre}
                      <p className="text-label-md text-on-surface-variant">
                        En {fila.num_facturas} {fila.num_facturas === 1 ? 'factura' : 'facturas'}
                      </p>
                    </td>
                    <td className="num">{formatCantidad(fila.cantidad)}</td>
                    <td className="num font-semibold">{formatMoneda(fila.importe)}</td>
                    <td className="num">{formatPorcentaje(fila.participacion_pct)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
