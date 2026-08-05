import React, { useEffect, useState } from 'react';
import { fetchRankingProductos, exportarReporte, descargarBlob, RUTAS_REPORTES } from '../../../api/reportes';
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

export default function RankingProductos({ permisos = [] }) {
  const puedeExportar = permisos.includes('ventas:reportes:exportar');
  const puedeVerTodo = permisos.includes('ventas:pipeline:ver_todo');

  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(haceDias(0));
  const [orden, setOrden] = useState('monto');
  const [limit, setLimit] = useState(10);
  const [clienteId, setClienteId] = useState('');
  const [vendedorId, setVendedorId] = useState('');

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  function armarParams() {
    const params = { desde, hasta, orden, limit };
    if (clienteId) params.cliente_id = clienteId;
    if (puedeVerTodo && vendedorId) params.vendedor_id = vendedorId;
    return params;
  }

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchRankingProductos(armarParams());
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
      const res = await exportarReporte(RUTAS_REPORTES.productos, armarParams(), formato);
      descargarBlob(res.data, `ranking-productos_${desde}_${hasta}.${formato}`);
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
        titulo="Ranking de productos"
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
            <option value="monto">Importe</option>
            <option value="cantidad">Cantidad</option>
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

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-600 mb-1">Cliente (ID)</label>
          <input
            type="text"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            placeholder="Opcional"
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs w-40 focus:ring-2 focus:ring-red-800 focus:outline-none"
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
              <span className="text-slate-500">Importe bruto total: </span>
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
                  <th className="p-3">SKU</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3 text-right">Importe (bruto)</th>
                  <th className="p-3 text-right">% Participación</th>
                  <th className="p-3 text-right"># Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.resultados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Sin resultados en el rango seleccionado.
                    </td>
                  </tr>
                )}
                {data.resultados.map((fila) => (
                  <tr key={fila.producto_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500">{fila.sku}</td>
                    <td className="p-3 font-semibold text-slate-800">{fila.nombre}</td>
                    <td className="p-3 text-right text-slate-600">{fila.cantidad}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatMoney(fila.importe)}</td>
                    <td className="p-3 text-right text-slate-600">{formatPct(fila.participacion_pct)}</td>
                    <td className="p-3 text-right text-slate-600">{fila.num_facturas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}