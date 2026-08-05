import React, { useEffect, useState } from 'react';
import { fetchVendedores, exportarReporte, descargarBlob, RUTAS_REPORTES } from '../../../api/reportes';
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

export default function Vendedores({ permisos = [] }) {
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
      const res = await fetchVendedores(armarParams());
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
      const res = await exportarReporte(RUTAS_REPORTES.vendedores, armarParams(), formato);
      descargarBlob(res.data, `vendedores_${desde}_${hasta}.${formato}`);
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
        titulo="Desempeño de vendedores"
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
        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
              <tr>
                <th className="p-3">Vendedor</th>
                <th className="p-3 text-right">Op. ganadas</th>
                <th className="p-3 text-right">Op. perdidas</th>
                <th className="p-3 text-right">% Conversión</th>
                <th className="p-3 text-right">Cotiz. emitidas</th>
                <th className="p-3 text-right">Cotiz. aprobadas</th>
                <th className="p-3 text-right">Pedidos confirmados</th>
                <th className="p-3 text-right"># Facturas</th>
                <th className="p-3 text-right">Facturado</th>
                <th className="p-3 text-right">Notas de crédito</th>
                <th className="p-3 text-right">Venta neta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.resultados.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Sin actividad en el rango seleccionado.
                  </td>
                </tr>
              )}
              {data.resultados.map((fila) => {
                const sinAsignar = fila.vendedor_id === null;
                const neta = Number(fila.venta_neta);
                return (
                  <tr
                    key={fila.vendedor_id ?? 'sin-asignar'}
                    className={`hover:bg-slate-50 transition-colors ${sinAsignar ? 'bg-slate-50 italic text-slate-500' : ''}`}
                  >
                    <td className="p-3 font-semibold text-slate-800">
                      {fila.nombre}
                      {sinAsignar && (
                        <span className="ml-2 text-[10px] not-italic bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          histórico sin atribuir
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-600">{fila.oportunidades_ganadas}</td>
                    <td className="p-3 text-right text-slate-600">{fila.oportunidades_perdidas}</td>
                    <td className="p-3 text-right text-slate-600">{formatPct(fila.tasa_conversion_pct)}</td>
                    <td className="p-3 text-right text-slate-600">{fila.cotizaciones_emitidas}</td>
                    <td className="p-3 text-right text-slate-600">{fila.cotizaciones_aprobadas}</td>
                    <td className="p-3 text-right text-slate-600">{fila.pedidos_confirmados}</td>
                    <td className="p-3 text-right text-slate-600">{fila.num_facturas}</td>
                    <td className="p-3 text-right text-slate-600">{formatMoney(fila.facturado)}</td>
                    <td className="p-3 text-right text-slate-600">{formatMoney(fila.notas_credito)}</td>
                    <td className={`p-3 text-right font-bold ${!sinAsignar && neta < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {formatMoney(fila.venta_neta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}