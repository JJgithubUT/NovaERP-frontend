import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, vendedores } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { formatPorcentaje, rangoPorDefecto, useExportacion } from './useReporte';

const COLUMNAS = 7;

/**
 * RV-06 · Desempeño por vendedor.
 *
 * Dos detalles del contrato que la tabla respeta:
 *
 * - Puede venir una fila con `vendedor_id: null` — es el agregado **«Sin
 *   asignar»**, no un vendedor. Se marca para que no se lea como una persona.
 * - `num_vendedores` en los totales **no cuenta** esa fila.
 */
export function VendedoresPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const inicial = rangoPorDefecto();

  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [query, setQuery] = useState(inicial);

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-vendedores', query),
    queryFn: () => vendedores(query),
  });

  const { exportando, exportar } = useExportacion(RUTAS_REPORTE.vendedores, 'vendedores');

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Desempeño por vendedor"
        descripcion="Del pipeline a la factura, por persona. La fila «Sin asignar» agrupa lo que no tiene vendedor."
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
        cargando={consulta.isFetching}
        exportando={exportando}
        nota={datos?.nota}
        alcanceVendedor={datos?.alcance_vendedor ?? null}
        generadoEn={datos?.generado_en}
        onBuscar={() => setQuery({ desde, hasta })}
        onExportar={(formato) => exportar(query, formato)}
      />

      {totales ? (
        <TotalesReporte
          items={[
            { etiqueta: 'Venta neta', valor: formatMoneda(totales.venta_neta), destacado: true },
            { etiqueta: 'Vendedores', valor: String(totales.num_vendedores) },
            { etiqueta: 'Oportunidades ganadas', valor: String(totales.oportunidades_ganadas) },
            { etiqueta: 'Pedidos confirmados', valor: String(totales.pedidos_confirmados) },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th className="num">Ganadas</th>
              <th className="num">Perdidas</th>
              <th className="num">Conversión</th>
              <th className="num">Cotizaciones</th>
              <th className="num">Facturas</th>
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
              mensajeVacio="Sin actividad de vendedores en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={fila.vendedor_id ?? 'sin-asignar'}>
                    <td className="font-medium">
                      {fila.nombre}
                      {fila.vendedor_id === null ? (
                        <span className="ml-2 text-label-md text-on-surface-variant">
                          (agregado)
                        </span>
                      ) : null}
                    </td>
                    <td className="num">{fila.oportunidades_ganadas}</td>
                    <td className="num tenue">{fila.oportunidades_perdidas}</td>
                    <td className="num">{formatPorcentaje(fila.tasa_conversion_pct)}</td>
                    <td className="num tenue">
                      {fila.cotizaciones_aprobadas}/{fila.cotizaciones_emitidas}
                    </td>
                    <td className="num tenue">{fila.num_facturas}</td>
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
