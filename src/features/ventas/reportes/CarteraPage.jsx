import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RUTAS_REPORTE, cartera } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { aFechaIso } from '../../../shared/utils/fecha.util';
import { ReporteHeader, TotalesReporte } from './ReporteHeader';
import { useExportacion } from './useReporte';

const COLUMNAS = 7;

/** Los cuatro cubos de antigüedad, del más reciente al más vencido. */
const CUBOS = [
  { clave: 'dias_0_30', etiqueta: '0–30 días' },
  { clave: 'dias_31_60', etiqueta: '31–60' },
  { clave: 'dias_61_90', etiqueta: '61–90' },
  { clave: 'dias_90_mas', etiqueta: '+90' },
];

/**
 * RV-05 · Cartera (antigüedad de saldos).
 *
 * Es el único reporte a **fecha de corte** y no a rango: es una foto del saldo
 * pendiente en un instante, no un acumulado de un periodo.
 *
 * La antigüedad se cuenta desde la **emisión** de la factura, no desde su
 * vencimiento — el backend lo declara en `criterio` y se muestra tal cual,
 * porque cambia la lectura de todos los cubos.
 */
export function CarteraPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const hoy = aFechaIso(new Date());

  const [corte, setCorte] = useState(hoy);
  const [query, setQuery] = useState({ corte: hoy });

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'reportes-cartera', query),
    queryFn: () => cartera(query),
  });

  const { exportando, exportar } = useExportacion(RUTAS_REPORTE.cartera, 'cartera');

  const datos = consulta.data;
  const filas = datos?.resultados ?? [];
  const totales = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <ReporteHeader
        titulo="Cartera"
        descripcion="Saldo pendiente de cobro por cliente, repartido en cubos de antigüedad."
        modo="corte"
        corte={corte}
        onCorte={setCorte}
        cargando={consulta.isFetching}
        exportando={exportando}
        alcanceVendedor={datos?.alcance_vendedor ?? null}
        generadoEn={datos?.generado_en}
        onBuscar={() => setQuery({ corte })}
        onExportar={(formato) => exportar(query, formato)}
      />

      {datos?.criterio ? (
        <p className="rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
          <strong className="font-semibold">Criterio:</strong> {datos.criterio}
        </p>
      ) : null}

      {totales ? (
        <TotalesReporte
          items={[
            { etiqueta: 'Saldo total', valor: formatMoneda(totales.saldo_total), destacado: true },
            { etiqueta: 'Clientes', valor: String(totales.num_clientes) },
            { etiqueta: 'Facturas', valor: String(totales.num_facturas) },
            {
              etiqueta: 'Vencido +90',
              valor: formatMoneda(totales.dias_90_mas ?? '0'),
            },
          ]}
        />
      ) : null}

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="num">Facturas</th>
              {CUBOS.map((cubo) => (
                <th key={cubo.clave} className="num">
                  {cubo.etiqueta}
                </th>
              ))}
              <th className="num">Saldo total</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin saldos pendientes a esta fecha."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={fila.cliente_id}>
                    <td className="font-medium">{fila.razon_social}</td>
                    <td className="num tenue">{fila.num_facturas}</td>
                    {CUBOS.map((cubo) => {
                      const valor = fila[cubo.clave] ?? '0';
                      // Lo vencido a más de 90 días se marca: es lo que hay que
                      // perseguir, y en una fila de seis números se pierde.
                      const critico = cubo.clave === 'dias_90_mas' && toDecimal(valor).gt(0);
                      return (
                        <td
                          key={cubo.clave}
                          className={`num ${critico ? 'font-semibold text-error' : 'tenue'}`}
                        >
                          {formatMoneda(valor)}
                        </td>
                      );
                    })}
                    <td className="num font-semibold">{formatMoneda(fila.saldo_total)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
