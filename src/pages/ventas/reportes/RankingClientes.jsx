import React, { useEffect, useState } from 'react';
import { fetchRankingClientes, exportarReporte, descargarBlob, RUTAS_REPORTES } from '../../../api/reportes';
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

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX');
}

export default function RankingClientes({ permisos = [] }) {
  const puedeExportar = permisos.includes('ventas:reportes:exportar');
  const puedeVerTodo = permisos.includes('ventas:pipeline:ver_todo');

  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(haceDias(0));
  const [orden, setOrden] = useState('monto');
  const [limit, setLimit] = useState(10);
  const [vendedorId, setVendedorId] = useState('');

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  function armarParams() {
    const params = { desde, hasta, orden, limit };
    if (puedeVerTodo && vendedorId) params.vendedor_id = vendedorId;
    return params;
  }

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchRankingClientes(armarParams());
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
      const res = await exportarReporte(RUTAS_REPORTES.clientes, armarParams(), formato);
      descargarBlob(res.data, `ranking-clientes_${desde}_${hasta}.${formato}`);
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
        titulo="Ranking de clientes"
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
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-600 mb-1">Ordenar por</label>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
          >
            <option value="monto">Venta neta</option>
            <option value="volumen"># Facturas</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-600 mb-1">Top</label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs w-20 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
        </div>

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
          <div className="flex gap-6 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <span className="text-slate-500">Venta neta total del rango: </span>
              <span className="font-bold text-slate-800">{formatMoney(data.totales.venta_neta)}</span>
            </div>
            <div>
              <span className="text-slate-500">Facturas: </span>
              <span className="font-bold text-slate-800">{data.totales.num_facturas}</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right"># Facturas</th>
                  <th className="p-3 text-right">Total facturado</th>
                  <th className="p-3 text-right">Notas de crédito</th>
                  <th className="p-3 text-right">Venta neta</th>
                  <th className="p-3 text-right">% Participación</th>
                  <th className="p-3 text-right">Última compra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.resultados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Sin resultados en el rango seleccionado.
                    </td>
                  </tr>
                )}
                {data.resultados.map((fila) => {
                  const neta = Number(fila.venta_neta);
                  return (
                    <tr key={fila.cliente_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">{fila.razon_social}</td>
                      <td className="p-3 text-right text-slate-600">{fila.num_facturas}</td>
                      <td className="p-3 text-right text-slate-600">{formatMoney(fila.total_facturado)}</td>
                      <td className="p-3 text-right text-slate-600">{formatMoney(fila.notas_credito)}</td>
                      <td className={`p-3 text-right font-bold ${neta < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatMoney(fila.venta_neta)}
                      </td>
                      <td className="p-3 text-right text-slate-600">{formatPct(fila.participacion_pct)}</td>
                      <td className="p-3 text-right text-slate-600">{formatFecha(fila.ultima_compra)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}