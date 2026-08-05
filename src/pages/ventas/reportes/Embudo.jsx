import React, { useEffect, useState } from 'react';
import { fetchEmbudo, exportarReporte, descargarBlob, RUTAS_REPORTES } from '../../../api/reportes';
import ReporteHeader from './ReporteHeader';

function haceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatMoney(valorString) {
  if (valorString === null || valorString === undefined) return '—';
  return Number(valorString).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatPct(valorString) {
  if (valorString === null || valorString === undefined) return '—';
  return `${Number(valorString).toFixed(1)}%`;
}

const NOMBRE_ETAPA = {
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  pedidos: 'Pedidos vivos',
  facturas: 'Facturas',
};

export default function Embudo({ permisos = [] }) {
  const puedeExportar = permisos.includes('ventas:reportes:exportar');
  const puedeVerTodo = permisos.includes('ventas:pipeline:ver_todo');

  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(haceDias(0));
  const [vendedorId, setVendedorId] = useState('');

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  function armarParams() {
    const params = { desde, hasta };
    if (puedeVerTodo && vendedorId) params.vendedor_id = vendedorId;
    return params;
  }

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchEmbudo(armarParams());
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'No se pudo cargar el reporte.');
      setData(null);
    } finally {
      setCargando(false);
    }
  }

  async function exportar(formato) {
    setExportando(true);
    setError(null);
    try {
      const res = await exportarReporte(RUTAS_REPORTES.embudo, armarParams(), formato);
      descargarBlob(res.data, `embudo_${desde}_${hasta}.${formato}`);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'No se pudo exportar el reporte.');
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    buscar();
  }, []);

  return (
    <div className="space-y-6">
      <ReporteHeader
        titulo="Embudo comercial"
        modo="rango"
        desde={desde}
        hasta={hasta}
        onDesdeChange={setDesde}
        onHastaChange={setHasta}
        onBuscar={buscar}
        cargando={cargando}
        nota={data?.nota}
        alcanceVendedor={data?.alcance_vendedor}
        generadoEn={data?.generado_en}
        puedeExportar={puedeExportar}
        onExportar={exportar}
        exportando={exportando}
      >
        {puedeVerTodo && (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-600 mb-1">Vendedor (ID)</label>
            <input
              type="text"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              placeholder="Todos"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs w-40 focus:ring-2 focus:ring-red-800 focus:outline-none"
            />
          </div>
        )}
      </ReporteHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {data.resultados.map((etapa, i) => (
              <div key={etapa.etapa} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm hover:border-red-800 transition-colors">
                <div className="text-xs font-medium text-slate-500 mb-1">{NOMBRE_ETAPA[etapa.etapa] ?? etapa.etapa}</div>
                <div className="text-2xl font-bold text-red-800">{etapa.conteo}</div>
                <div className="text-xs font-semibold text-slate-700 mt-1">{formatMoney(etapa.monto)}</div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {i === 0 ? 'Etapa inicial' : `Conversión: ${formatPct(etapa.conversion_pct)}`}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <div className="text-slate-500">Ganadas / Perdidas</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">
                {data.totales.ganadas ?? '—'} / {data.totales.perdidas ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tasa de cierre: {formatPct(data.totales.tasa_cierre_ganado_pct)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Aprobadas / Rechazadas</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">
                {data.totales.aprobadas ?? '—'} / {data.totales.rechazadas ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tasa de aprobación: {formatPct(data.totales.tasa_aprobacion_pct)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Cotizaciones vencidas</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{data.totales.cotizaciones_vencidas ?? '—'}</div>
              <div className="text-[11px] text-slate-400 mt-1">Derivado de vigente_hasta</div>
            </div>
            <div>
              <div className="text-slate-500">Pedidos cancelados</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{data.totales.pedidos_cancelados ?? '—'}</div>
            </div>
          </div>

          {data.motivos_perdida?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-800">Motivos de pérdida</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Motivo</th>
                      <th className="p-3 text-right">Conteo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {data.motivos_perdida.map((m) => (
                      <tr key={m.motivo} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{m.motivo}</td>
                        <td className="p-3 text-right text-slate-600">{m.conteo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}