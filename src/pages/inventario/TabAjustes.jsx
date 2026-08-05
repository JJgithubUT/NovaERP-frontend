import React from 'react';
import { Paginacion, FilaCargando } from './UI';
import { MOTIVO_LABELS, formatFecha, formatCantidad } from './inventario.utils';

export default function TabAjustes({
  ajustes, loading, error, page, onPageChange, count, pageSize, onNuevoAjuste,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Ajustes de Inventario (Mermas / Conteos)</h2>
          <p className="text-slate-500 text-xs">La cantidad puede ser positiva o negativa; se aplica de inmediato.</p>
        </div>
        <button
          onClick={onNuevoAjuste}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Registrar Ajuste
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Almacén</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3">Aprobado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={6} error={error} />}
            {!loading && !error && ajustes.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  Sin ajustes registrados. Registra un conteo físico o una merma.
                </td>
              </tr>
            )}
            {!loading && !error && ajustes.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-xs text-slate-500">{formatFecha(a.created_at)}</td>
                <td className="p-3 text-slate-800 font-medium">{MOTIVO_LABELS[a.motivo] || a.motivo}</td>
                <td className="p-3 font-mono text-xs text-slate-600">{a.producto_id}</td>
                <td className="p-3 font-mono text-xs text-slate-600">{a.almacen_id}</td>
                <td className={`p-3 text-right font-mono font-bold ${Number(a.cantidad) < 0 ? 'text-red-700' : 'text-emerald-600'}`}>
                  {Number(a.cantidad) > 0 ? '+' : ''}{formatCantidad(a.cantidad)}
                </td>
                <td className="p-3 font-mono text-xs text-slate-500">{a.aprobado_por ? a.aprobado_por.slice(0, 8) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion page={page} onPageChange={onPageChange} count={count} pageSize={pageSize} />
      </div>
    </div>
  );
}