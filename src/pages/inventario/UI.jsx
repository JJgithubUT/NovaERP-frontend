// inventario/UI.jsx
// Piezas visuales compartidas por todos los Tabs y modales del módulo,
// reusando la paleta que ya tiene Inventario.jsx (acento #800000, slate-*).
import React from 'react';

export function Paginacion({ page, onPageChange, count, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500">
      <span>{count} registro{count === 1 ? '' : 's'} · página {page} de {totalPages}</span>
      <div className="flex gap-2">
        <button
          className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <button
          className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function EstadoVacio({ titulo, children }) {
  return (
    <div className="py-12 text-center">
      <p className="text-slate-700 font-medium mb-1">{titulo}</p>
      {children && <p className="text-sm text-slate-400">{children}</p>}
    </div>
  );
}

export function FilaCargando({ colSpan, error }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`text-center py-6 text-sm ${error ? 'text-red-600' : 'text-slate-400'}`}>
        {error || 'Cargando…'}
      </td>
    </tr>
  );
}

export function Badge({ children, className }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function EstadoBadge({ activo }) {
  return (
    <Badge className={activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/40 ${props.className || ''}`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/40 ${props.className || ''}`}
    />
  );
}

export function BotonPrimario({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 bg-[#800000] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#6b0000] transition-colors disabled:opacity-50 ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function BotonPeligro({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function AvisoFlujo({ children }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-xs text-[#6b0000]">
      {children}
    </div>
  );
}