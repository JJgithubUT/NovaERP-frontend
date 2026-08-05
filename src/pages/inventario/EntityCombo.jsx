import React, { useState, useEffect, useRef } from 'react';
import { inventarioApi, searchParam } from './api';

export default function EntityCombo({ label, tipo, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const fetcher = tipo === 'producto' ? inventarioApi.listarProductos : inventarioApi.listarAlmacenes;
      fetcher({ page_size: 10, ...searchParam(query) })
        .then((data) => {
          if (!alive) return;
          const results = data.results || data.items || (Array.isArray(data) ? data : []);
          setOptions(results.filter((o) => o.activo !== false));
        })
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setLoading(false));
    }, 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, open, tipo]);

  useEffect(() => {
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (value) {
    return (
      <div>
        <label className="block text-xs font-semibold text-[var(--color-gris-medio)] mb-1">{label}</label>
        <div className="flex items-center justify-between bg-[#73030D]/5 border border-[#73030D]/20 rounded-lg px-3 py-2 text-sm">
          <span className="text-[var(--color-negro-profundo)]">{value.label}</span>
          <button type="button" className="text-[var(--color-guinda-base)] hover:text-[var(--color-rojo-hover)] text-xs font-semibold" onClick={() => onChange(null)}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-xs font-semibold text-[var(--color-gris-medio)] mb-1">{label}</label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-guinda-base)]/40"
        placeholder={placeholder || 'Buscar por sku / nombre…'}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-sm text-[var(--color-gris-medio)]">Buscando…</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-[var(--color-gris-medio)]">Sin resultados</div>}
          {!loading && options.map((o) => (
            <div
              key={o.id}
              className="px-3 py-2 text-sm hover:bg-[#73030D]/5 cursor-pointer"
              onClick={() => {
                const lbl = o.sku ? `${o.sku} — ${o.nombre}` : o.nombre;
                onChange({ id: o.id, label: lbl });
                setOpen(false);
                setQuery('');
              }}
            >
              {o.sku ? `${o.sku} — ${o.nombre}` : o.nombre}
              {o.ubicacion && <div className="text-xs text-[var(--color-gris-medio)]">{o.ubicacion}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}