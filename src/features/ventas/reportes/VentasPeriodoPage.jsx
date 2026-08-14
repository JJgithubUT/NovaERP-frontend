import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, ventasPorPeriodo } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { rangoPorDefecto, useExportacion } from './useReporte';

const COLUMNAS = 7;

/**
 * RV-01 · Ventas por periodo.
 *
 * La cifra que importa es **venta neta** (`total_facturado − notas_credito`),
 * no el total facturado: una nota de crédito ya devolvió parte de ese dinero.
 * Por eso es la única columna destacada y la que encabeza los totales.
 */
export function VentasPeriodoPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const inicial = rangoPorDefecto();

  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [agrupar, setAgrupar] = useState('dia');
  /** Solo se consulta al pulsar: un reporte pesado no se dispara al teclear. */
  const [query, setQuery] = useState({ ...inicial, agrupar: 'dia' });

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-ventas-periodo', query),
    queryFn: () => ventasPorPeriodo(query),
  });

  const { exportando, exportar } = useExportacion(
    RUTAS_REPORTE.ventasPeriodo,
    'ventas-por-periodo',
  );

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Ventas por periodo"
        descripcion="Facturación agrupada en cubos de tiempo. La venta neta ya descuenta las notas de crédito."
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
        cargando={consulta.isFetching}
        exportando={exportando}
        nota={datos?.nota}
        alcanceVendedor={datos?.alcance_vendedor ?? null}
        generadoEn={datos?.generado_en}
        onBuscar={() => setQuery({ desde, hasta, agrupar })}
        onExportar={(formato) => exportar(query, formato)}
      >
        <div className="campo">
          <label className="text-label-caps uppercase text-on-surface-variant" htmlFor="agrupar">
            Agrupar por
          </label>
          <select
            id="agrupar"
            className="campo-control"
            value={agrupar}
            onChange={(e) => setAgrupar(e.target.value)}
          >
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>
      </ReporteHeader>

      {totales ? (
        <TotalesReporte
          items={[
            { etiqueta: 'Venta neta', valor: formatMoneda(totales.venta_neta), destacado: true },
            { etiqueta: 'Facturado', valor: formatMoneda(totales.total_facturado) },
            { etiqueta: 'Notas de crédito', valor: formatMoneda(totales.notas_credito) },
            { etiqueta: 'Facturas', valor: String(totales.num_facturas) },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Periodo</th>
              <th className="num">Facturas</th>
              <th className="num">Subtotal</th>
              <th className="num">Impuestos</th>
              <th className="num">Facturado</th>
              <th className="num">Notas crédito</th>
              <th className="num">Venta neta</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin facturación en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={fila.periodo}>
                    <td className="font-medium">{formatFecha(fila.periodo)}</td>
                    <td className="num tenue">{fila.num_facturas}</td>
                    <td className="num tenue">{formatMoneda(fila.subtotal)}</td>
                    <td className="num tenue">{formatMoneda(fila.impuestos)}</td>
                    <td className="num">{formatMoneda(fila.total_facturado)}</td>
                    <td className="num tenue">{formatMoneda(fila.notas_credito)}</td>
                    <td className="num font-semibold">{formatMoneda(fila.venta_neta)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
