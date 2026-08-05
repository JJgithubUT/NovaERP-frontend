import React, { useEffect, useState } from 'react';
import { fetchCartera, exportarReporte, descargarBlob, RUTAS_REPORTES } from '../../../api/reportes';
import ReporteHeader from './ReporteHeader';

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(valorString) {
  if (valorString === null || valorString === undefined) return '—';
  return Number(valorString).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function Cartera({ permisos = [] }) {
  const puedeExportar = permisos.includes('ventas:reportes:exportar');

  const [corte, setCorte] = useState(hoy());
  const [clienteId, setClienteId] = useState('');
  const [incluirDetalle, setIncluirDetalle] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  function armarParams() {
    const params = { corte };
    if (clienteId) params.cliente_id = clienteId;
    if (incluirDetalle) {
      params.detalle = true;
      params.page = page;
      params.page_size = pageSize;
    }
    return params;
  }

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchCartera(armarParams());
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
      const res = await exportarReporte(RUTAS_REPORTES.cartera, { corte, cliente_id: clienteId || undefined }, formato);
      descargarBlob(res.data, `cartera_${corte}.${formato}`);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'No se pudo exportar el reporte.');
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    buscar();
  }, []);

  useEffect(() => {
    if (incluirDetalle) buscar();
  }, [page]);

  const detalleRows = data?.detalle?.results ?? [];
  const columnasDetalle = detalleRows.length > 0 ? Object.keys(detalleRows[0]) : [];

  return (
    <div className="space-y-6">
      <ReporteHeader
        titulo="Cartera por antigüedad"
        modo="corte"
        corte={corte}
        onCorteChange={setCorte}
        onBuscar={() => {
          setPage(1);
          buscar();
        }}
        cargando={cargando}
        nota={data?.criterio}
        alcanceVendedor={data?.alcance_vendedor}
        generadoEn={data?.generado_en}
        puedeExportar={puedeExportar}
        onExportar={exportar}
        exportando={exportando}
      >
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

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 pb-2">
          <input
            type="checkbox"
            checked={incluirDetalle}
            onChange={(e) => {
              setIncluirDetalle(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300 text-red-800 focus:ring-red-800"
          />
          Detalle por factura
        </label>
      </ReporteHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <div className="text-slate-500">Clientes</div>
              <div className="font-bold text-slate-800 text-sm">{data.totales.num_clientes}</div>
            </div>
            <div>
              <div className="text-slate-500">Facturas</div>
              <div className="font-bold text-slate-800 text-sm">{data.totales.num_facturas}</div>
            </div>
            <div>
              <div className="text-slate-500">Saldo total</div>
              <div className="font-bold text-slate-800 text-sm">{formatMoney(data.totales.saldo_total)}</div>
            </div>
            <div>
              <div className="text-slate-500">0-30 días</div>
              <div className="font-bold text-slate-800 text-sm">{formatMoney(data.totales.dias_0_30)}</div>
            </div>
            <div>
              <div className="text-slate-500">31-60 días</div>
              <div className="font-bold text-slate-800 text-sm">{formatMoney(data.totales.dias_31_60)}</div>
            </div>
            <div>
              <div className="text-slate-500">90+ días</div>
              <div className="font-bold text-red-600 text-sm">{formatMoney(data.totales.dias_90_mas)}</div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right"># Facturas</th>
                  <th className="p-3 text-right">Saldo total</th>
                  <th className="p-3 text-right">0-30</th>
                  <th className="p-3 text-right">31-60</th>
                  <th className="p-3 text-right">61-90</th>
                  <th className="p-3 text-right">90+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.resultados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Sin cuentas pendientes a la fecha de corte.
                    </td>
                  </tr>
                )}
                {data.resultados.map((fila) => (
                  <tr key={fila.cliente_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{fila.razon_social}</td>
                    <td className="p-3 text-right text-slate-600">{fila.num_facturas}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatMoney(fila.saldo_total)}</td>
                    <td className="p-3 text-right text-slate-600">{formatMoney(fila.dias_0_30)}</td>
                    <td className="p-3 text-right text-slate-600">{formatMoney(fila.dias_31_60)}</td>
                    <td className="p-3 text-right text-slate-600">{formatMoney(fila.dias_61_90)}</td>
                    <td className="p-3 text-right font-bold text-red-600">{formatMoney(fila.dias_90_mas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {incluirDetalle && data.detalle && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-800">Detalle por factura</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
                    <tr>
                      {columnasDetalle.map((col) => (
                        <th key={col} className="p-3">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {detalleRows.length === 0 && (
                      <tr>
                        <td colSpan={columnasDetalle.length} className="p-8 text-center text-slate-400">
                          Sin registros.
                        </td>
                      </tr>
                    )}
                    {detalleRows.map((fila, i) => (
                      <tr key={fila.id ?? i} className="hover:bg-slate-50 transition-colors">
                        {columnasDetalle.map((col) => (
                          <td key={col} className="p-3 text-slate-600">{String(fila[col] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>
                  Página {data.detalle.page} de {data.detalle.num_pages} · {data.detalle.count} registros
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.detalle.page <= 1}
                    className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.detalle.num_pages, p + 1))}
                    disabled={data.detalle.page >= data.detalle.num_pages}
                    className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}