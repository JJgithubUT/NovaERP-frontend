import React from 'react';
import { Paginacion, FilaCargando } from './UI';
import { formatFecha, formatCantidad } from './inventario.utils';

export default function TabAlertas({
  alertas, loading, error, filtro, onFiltroChange,
  page, onPageChange, count, pageSize, onMarcarNotificada, notificandoId,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-xs">
        <strong className="font-bold">Se generan solas:</strong> una salida o ajuste que deja el stock en o por debajo del stock mínimo del producto dispara una alerta automáticamente.
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Alertas de Stock Mínimo</h2>
          <p className="text-slate-500 text-xs">Monitoreo automático de productos con existencias críticas.</p>
        </div>
        <select
          value={filtro}
          onChange={(e) => onFiltroChange(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-800 focus:outline-none"
        >
          <option value="">Todas</option>
          <option value="false">Pendientes</option>
          <option value="true">Notificadas</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Disparada</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Almacén</th>
              <th className="p-3 text-right">Cantidad al disparo</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={6} error={error} />}
            {!loading && !error && alertas.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  Todo el stock está por encima de su mínimo. No hay alertas.
                </td>
              </tr>
            )}
            {!loading && !error && alertas.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-xs text-slate-500">{formatFecha(a.disparada_en)}</td>
                <td className="p-3 font-mono text-xs text-slate-800 font-semibold">{a.producto_id}</td>
                <td className="p-3 font-mono text-xs text-slate-600">{a.almacen_id}</td>
                <td className="p-3 text-right font-mono font-bold text-amber-700">{formatCantidad(a.cantidad_al_disparo)}</td>
                <td className="p-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    a.notificada ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.notificada ? 'Notificada' : 'Pendiente'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {!a.notificada && (
                    <button
                      disabled={notificandoId === a.id}
                      onClick={() => onMarcarNotificada(a.id)}
                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium text-center transition-colors disabled:opacity-50"
                    >
                      {notificandoId === a.id ? 'Marcando…' : 'Marcar Notificada'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion page={page} onPageChange={onPageChange} count={count} pageSize={pageSize} />
      </div>
    </div>
  );
}