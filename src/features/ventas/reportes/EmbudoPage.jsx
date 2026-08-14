import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, embudo } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { formatPorcentaje, rangoPorDefecto, useExportacion } from './useReporte';

const COLUMNAS = 4;

const ETAPA_LABEL = {
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  pedidos: 'Pedidos',
  facturas: 'Facturas',
};

/**
 * RV-04 · Embudo comercial.
 *
 * `conversion_pct` es respecto de la **etapa anterior**, no del total, y es
 * `null` en la primera —no hay etapa previa contra la que comparar—. Mostrar
 * ahí un 100 % o un cero sería inventar un dato.
 *
 * Los motivos de pérdida se listan aparte porque responden a otra pregunta: no
 * cuánto se cae el embudo, sino por qué.
 */
export function EmbudoPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const inicial = rangoPorDefecto();

  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [query, setQuery] = useState(inicial);

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-embudo', query),
    queryFn: () => embudo(query),
  });

  const { exportando, exportar } = useExportacion(RUTAS_REPORTE.embudo, 'embudo');

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;
  const motivos = datos?.motivos_perdida ?? [];

  const maximo = Math.max(1, ...filas.map((f) => f.conteo));

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Embudo comercial"
        descripcion="Cuánto se conserva en cada paso del ciclo. La conversión compara con la etapa anterior."
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
            {
              etiqueta: 'Venta facturada',
              valor: formatMoneda(totales.venta_facturada),
              destacado: true,
            },
            {
              etiqueta: 'Tasa de cierre ganado',
              valor: formatPorcentaje(totales.tasa_cierre_ganado_pct),
            },
            {
              etiqueta: 'Tasa de aprobación',
              valor: formatPorcentaje(totales.tasa_aprobacion_pct),
            },
            { etiqueta: 'Pedidos cancelados', valor: String(totales.pedidos_cancelados) },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Etapa</th>
              <th className="num">Conteo</th>
              <th className="num">Monto</th>
              <th className="num">Conversión</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin actividad comercial en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={fila.etapa}>
                    <td className="font-medium">
                      {ETAPA_LABEL[fila.etapa] ?? fila.etapa}
                      {/* Barra proporcional a la etapa más poblada: enseña de un
                          vistazo dónde se estrecha el embudo. */}
                      <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-action"
                          style={{ width: `${(fila.conteo / maximo) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="num font-semibold">{fila.conteo}</td>
                    <td className="num">{formatMoneda(fila.monto)}</td>
                    <td className="num">{formatPorcentaje(fila.conversion_pct)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {motivos.length > 0 ? (
        <section>
          <h3 className="mb-2 text-label-caps uppercase text-on-surface-variant">
            Motivos de pérdida
          </h3>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Motivo</th>
                  <th className="num">Oportunidades</th>
                </tr>
              </thead>
              <tbody>
                {motivos.map((motivo) => (
                  <tr key={motivo.motivo}>
                    <td>{motivo.motivo}</td>
                    <td className="num font-semibold">{motivo.conteo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
