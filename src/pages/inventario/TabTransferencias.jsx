import React from 'react';
import { Paginacion, FilaCargando } from './UI';
import { formatFecha, formatCantidad } from './inventario.utils';

export default function TabTransferencias({
  transferencias, loading, error, filtroEstado, onFiltroEstadoChange,
  page, onPageChange, count, pageSize, onNuevaTransferencia, onCompletarTransferencia, completandoId,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-xs">
        <strong className="font-bold">Movimiento entre almacenes:</strong> Una transferencia salida resta stock del almacén de origen y al completarse suma stock en el almacén de destino.
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Transferencias entre Almacenes</h2>
          <p className="text-slate-500 text-xs">Control de envíos y recepciones de mercancía de un almacén a otro.</p>
        </div>
        
        <button
          onClick={onNuevaTransferencia}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Transferencia
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => onFiltroEstadoChange(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-800 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Destino</th>
              <th className="p-3">Producto</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={7} error={error} />}
            {!loading && !error && transferencias.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  No hay transferencias registradas. Crea la primera con “+ Nueva Transferencia”.
                </td>
              </tr>
            )}
            {!loading && !error && transferencias.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-xs text-slate-500">{formatFecha(t.created_at)}</td>
                <td className="p-3 text-slate-700 font-medium">{t.almacen_origen_nombre || t.almacen_origen_id}</td>
                <td className="p-3 text-slate-700 font-medium">{t.almacen_destino_nombre || t.almacen_destino_id}</td>
                <td className="p-3 font-mono text-xs text-slate-800 font-semibold">{t.producto_sku || t.producto_id}</td>
                <td className="p-3 text-right font-mono text-slate-800 font-semibold">{formatCantidad(t.cantidad)}</td>
                <td className="p-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    t.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-800' :
                    t.estado === 'CANCELADA' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.estado}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {t.estado === 'PENDIENTE' && onCompletarTransferencia && (
                    <button
                      disabled={completandoId === t.id}
                      onClick={() => onCompletarTransferencia(t.id)}
                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium text-center transition-colors disabled:opacity-50"
                    >
                      {completandoId === t.id ? 'Completando...' : 'Completar'}
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