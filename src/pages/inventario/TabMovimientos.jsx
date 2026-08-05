import React from 'react';
import { obtenerColorTipoMovimiento, TIPO_LABELS, formatFecha, formatCantidad, formatMoney } from './inventario.utils';
import { Paginacion, FilaCargando } from './UI';

export default function TabMovimientos({
  kardexList, loading, error, filtros, onFiltroChange,
  page, onPageChange, count, pageSize, onNuevoMovimiento,
}) {
  const setFiltro = (k, v) => onFiltroChange({ ...filtros, [k]: v });

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-xs">
        <strong className="font-bold">Bitácora inmutable:</strong> cada movimiento (entrada, salida, ajuste, transferencia) queda registrado aquí y nunca se edita ni se borra.
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Kardex de Movimientos</h2>
          <p className="text-slate-500 text-xs">Fuente de verdad de todo lo que altera el stock.</p>
        </div>
        <button
          onClick={onNuevoMovimiento}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Movimiento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="SKU..."
          value={filtros.sku}
          onChange={(e) => setFiltro('sku', e.target.value)}
          className="w-36 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Almacén..."
          value={filtros.almacen}
          onChange={(e) => setFiltro('almacen', e.target.value)}
          className="w-40 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
        />
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltro('tipo', e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-800 focus:outline-none"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Almacén</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Costo Unit.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={7} error={error} />}
            {!loading && !error && kardexList.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  Sin movimientos registrados en el kardex.
                </td>
              </tr>
            )}
            {!loading && !error && kardexList.map((k, idx) => (
              <tr key={k.movimiento_id ?? idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-xs text-slate-500">{formatFecha(k.ocurrido_en)}</td>
                <td className="p-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${obtenerColorTipoMovimiento(k.tipo)}`}>
                    {TIPO_LABELS[k.tipo] || k.tipo}
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-800 font-semibold">{k.sku}</td>
                <td className="p-3 text-slate-800 font-medium">{k.producto}</td>
                <td className="p-3 text-slate-600">{k.almacen}</td>
                <td className="p-3 text-right font-mono text-slate-800 font-semibold">{formatCantidad(k.cantidad)}</td>
                <td className="p-3 text-right font-mono text-slate-700">{k.costo_unitario ? `$${formatMoney(k.costo_unitario)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion page={page} onPageChange={onPageChange} count={count} pageSize={pageSize} />
      </div>
    </div>
  );
}