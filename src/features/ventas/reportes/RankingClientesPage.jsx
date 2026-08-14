import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, rankingClientes } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { formatPorcentaje, rangoPorDefecto, useExportacion } from './useReporte';

const COLUMNAS = 7;

/**
 * RV-02 · Ranking de clientes.
 *
 * `limit` recorta la **tabla**, no los totales: la participación de cada
 * cliente sigue calculándose sobre la venta de toda la organización. Un top 10
 * cuyos porcentajes sumen 60 % no es un error — el 40 % restante está en los
 * clientes que no se muestran.
 */
export function RankingClientesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const inicial = rangoPorDefecto();

  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [orden, setOrden] = useState('monto');
  const [limit, setLimit] = useState('10');
  const [query, setQuery] = useState({ ...inicial, orden: 'monto', limit: 10 });

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-clientes', query),
    queryFn: () => rankingClientes(query),
  });

  const { exportando, exportar } = useExportacion(RUTAS_REPORTE.clientes, 'ranking-clientes');

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Ranking de clientes"
        descripcion="Quién compra más. La participación se calcula sobre el total de la organización, no sobre el top mostrado."
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
            <option value="monto">Monto</option>
            <option value="volumen">Volumen (facturas)</option>
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
            { etiqueta: 'Venta neta', valor: formatMoneda(totales.venta_neta), destacado: true },
            { etiqueta: 'Clientes', valor: String(totales.num_clientes) },
            { etiqueta: 'Facturas', valor: String(totales.num_facturas) },
            { etiqueta: 'Notas de crédito', valor: formatMoneda(totales.notas_credito) },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Cliente</th>
              <th className="num">Facturas</th>
              <th className="num">Facturado</th>
              <th className="num">Notas crédito</th>
              <th className="num">Venta neta</th>
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
              mensajeVacio="Sin ventas a clientes en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila, indice) => (
                  <tr key={fila.cliente_id}>
                    <td className="num tenue">{indice + 1}</td>
                    <td className="font-medium">
                      {fila.razon_social}
                      <p className="text-label-md text-on-surface-variant">
                        Última compra: {formatFecha(fila.ultima_compra)}
                      </p>
                    </td>
                    <td className="num tenue">{fila.num_facturas}</td>
                    <td className="num tenue">{formatMoneda(fila.total_facturado)}</td>
                    <td className="num tenue">{formatMoneda(fila.notas_credito)}</td>
                    <td className="num font-semibold">{formatMoneda(fila.venta_neta)}</td>
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
