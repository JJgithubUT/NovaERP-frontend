import React from 'react';

export default function ReporteHeader({
  titulo,
  modo = 'rango',
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  corte,
  onCorteChange,
  onBuscar,
  cargando = false,
  nota,
  alcanceVendedor,
  generadoEn,
  puedeExportar = false,
  onExportar,
  exportando = false,
  children,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-xl font-bold text-red-800">{titulo}</h2>
        {generadoEn && (
          <span className="text-xs text-slate-400">
            Generado: {new Date(generadoEn).toLocaleString('es-MX')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm">
        {modo === 'rango' ? (
          <>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => onDesdeChange(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => onHastaChange(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-600 mb-1">Corte</label>
            <input
              type="date"
              value={corte}
              onChange={(e) => onCorteChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5">Por defecto, hoy</span>
          </div>
        )}

        {children}

        <button
          onClick={onBuscar}
          disabled={cargando}
          className="ml-auto px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-800 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {cargando ? 'Buscando…' : 'Buscar'}
        </button>

        {puedeExportar && (
          <div className="flex gap-2">
            <button
              onClick={() => onExportar('csv')}
              disabled={exportando}
              className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              CSV
            </button>
            <button
              onClick={() => onExportar('pdf')}
              disabled={exportando}
              className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              PDF
            </button>
          </div>
        )}
      </div>

      {alcanceVendedor && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3 shadow-sm">
          <span className="font-bold">Vista personal:</span>
          <span>
            Estás viendo únicamente tus propias cifras. No tienes permiso para ver
            los datos de otros vendedores.
          </span>
        </div>
      )}

      {nota && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg p-3 shadow-sm">
          <span className="font-bold">Nota:</span>
          <span>{nota}</span>
        </div>
      )}
    </div>
  );
}