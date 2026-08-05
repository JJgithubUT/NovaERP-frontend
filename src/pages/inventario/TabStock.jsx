import React from 'react';
import { Paginacion, FilaCargando } from './UI';
import { formatCantidad } from './inventario.utils';

export default function TabStock({
  stock, loading, error, search, onSearchChange, page, onPageChange, count, pageSize,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-red-800">Stock y Disponibilidad Actual</h2>
        <p className="text-slate-500 text-xs">Disponible = cantidad − reservado. Lo reservado son pedidos de venta confirmados.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Almacén</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Reservado</th>
              <th className="p-3 text-right">Disponible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={6} error={error} />}
            {!loading && !error && stock.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  Sin datos de stock disponibles.
                </td>
              </tr>
            )}
            {!loading && !error && stock.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-slate-800 font-semibold">{s.sku}</td>
                <td className="p-3 text-slate-800 font-medium">{s.producto}</td>
                <td className="p-3 text-slate-600">{s.almacen}</td>
                <td className="p-3 text-right font-mono text-slate-700">{formatCantidad(s.cantidad)}</td>
                <td className="p-3 text-right font-mono text-slate-500">{formatCantidad(s.reservado)}</td>
                <td className="p-3 text-right font-mono font-bold text-red-800">{formatCantidad(s.disponible)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion page={page} onPageChange={onPageChange} count={count} pageSize={pageSize} />
      </div>
    </div>
  );
}