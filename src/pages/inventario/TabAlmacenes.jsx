import React from 'react';
import { Paginacion, FilaCargando } from './UI';

export default function TabAlmacenes({
  almacenes, loading, error, search, onSearchChange,
  page, onPageChange, count, pageSize, onNuevoAlmacen, onEditarAlmacen, onToggleActivo,
}) {
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Almacenes</h2>
          <p className="text-slate-500 text-xs">Ubicaciones donde se guarda inventario. Nombre único por empresa.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
        </div>
        
        <button
          onClick={onNuevoAlmacen}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Almacén
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Ubicación</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(loading || error) && <FilaCargando colSpan={4} error={error} />}
            {!loading && !error && almacenes.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
                  No hay almacenes registrados. Registra el primero con “+ Nuevo Almacén”.
                </td>
              </tr>
            )}
            {!loading && !error && almacenes.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-semibold text-slate-800">{a.nombre}</td>
                <td className="p-3 text-slate-600">{a.ubicacion || 'Sin ubicación'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    a.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEditarAlmacen(a)}
                      className="w-20 shrink-0 px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium text-center transition-colors"
                    >
                      Editar
                    </button>
                    {onToggleActivo && (
                      <button
                        onClick={() => onToggleActivo(a)}
                        className={`w-24 shrink-0 px-2.5 py-1 rounded border border-red-800 text-[11px] font-medium text-center transition-colors ${
                          a.activo 
                            ? 'bg-white hover:bg-red-50 text-red-800' 
                            : 'bg-red-800 hover:bg-red-900 text-white'
                        }`}
                      >
                        {a.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
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