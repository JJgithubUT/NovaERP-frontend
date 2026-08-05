import React, { useState, useEffect } from 'react';
import {
  ESTADOS, ESTADO_BADGE, ESTADOS_EDITABLES, PAGE_SIZE,
  money, fmtDate, useClienteCache, useCotizaciones,
} from './cotizaciones.utils';
import { CotizacionForm, ResolverModal } from './CotizacionModales';

export default function TabCotizaciones() {
  const { filtros, cambiarFiltros, page, setPage, cotizacionesCrudas, total, loading, error, recargar } = useCotizaciones();
  const { nombreDe } = useClienteCache();

  // Filtrado de seguridad en cliente para validar folio y razón social
  const cotizaciones = cotizacionesCrudas.filter((cot) => {
    if (!filtros.search) return true;
    const termino = filtros.search.toLowerCase();
    const folioMatch = cot.folio?.toLowerCase().includes(termino);
    const clienteNombre = nombreDe(cot.cliente_id)?.toLowerCase() || '';
    const clienteMatch = clienteNombre.includes(termino);
    
    return folioMatch || clienteMatch;
  });

  const [modal, setModal] = useState(null);
  const [resolverTarget, setResolverTarget] = useState(null);

  const abrirCrear = () => setModal({ mode: 'crear' });
  const abrirEditar = (cot) => setModal({ mode: 'editar', cot });

  const onGuardado = () => { setModal(null); recargar(); };
  const onResuelta = () => { setResolverTarget(null); recargar(); };

  // ... (el resto de tu componente se mantiene igual)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Cotizaciones</h2>
          <p className="text-slate-500 text-xs">Propuestas comerciales, aprobación de descuentos y vigencias.</p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Cotización
        </button>
      </div>

      <Filtros filtros={filtros} onChange={cambiarFiltros} />

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Folio</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Desc.</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Vigencia</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Cargando catálogo desde la base de datos...
                </td>
              </tr>
            ) : cotizaciones.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No se encontraron cotizaciones que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              cotizaciones.map((cot) => (
                <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">{cot.folio}</td>
                  <td className="p-3 text-slate-600">{nombreDe(cot.cliente_id)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[cot.estado] || 'bg-slate-100 text-slate-600'}`}>
                      {ESTADOS.find((e) => e.value === cot.estado)?.label || cot.estado}
                    </span>
                    {cot.vencida && (
                      <span className="ml-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        Vencida
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-600">{money(cot.subtotal)}</td>
                  <td className="p-3 text-right text-slate-600">{Number(cot.descuento_pct)}%</td>
                  <td className="p-3 text-right font-medium text-slate-700">{money(cot.total)}</td>
                  <td className="p-3 text-slate-600">{cot.vigente_hasta ? fmtDate(cot.vigente_hasta) : '—'}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {ESTADOS_EDITABLES.has(cot.estado) && (
                        <button
                          onClick={() => abrirEditar(cot)}
                          className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {ESTADOS_EDITABLES.has(cot.estado) && (
                        <button
                          onClick={() => setResolverTarget(cot)}
                          className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded border border-red-800 text-[11px] font-medium transition-colors"
                        >
                          Resolver
                        </button>
                      )}
                      {!ESTADOS_EDITABLES.has(cot.estado) && (
                        <span className="text-[11px] text-slate-400">Sin acciones</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginacion page={page} total={total} onChange={setPage} />

      {modal && (
        <CotizacionForm
          mode={modal.mode}
          cotizacion={modal.cot}
          onClose={() => setModal(null)}
          onGuardado={onGuardado}
        />
      )}

      {resolverTarget && (
        <ResolverModal
          cotizacion={resolverTarget}
          onClose={() => setResolverTarget(null)}
          onResuelta={onResuelta}
        />
      )}
    </div>
  );
}

function Filtros({ filtros, onChange }) {
  const [searchTerm, setSearchTerm] = useState(filtros.search || '');

  useEffect(() => {
    setSearchTerm(filtros.search || '');
  }, [filtros.search]);

  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    set('search', val);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="w-full sm:w-80">
        <input
          type="text"
          placeholder="Buscar por Folio o Razón Social..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <select
          value={filtros.estado}
          onChange={(e) => set('estado', e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
        >
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={filtros.vencida}
            onChange={(e) => set('vencida', e.target.checked)}
            className="rounded border-slate-300 text-red-800 focus:ring-red-800"
          />
          Solo vencidas
        </label>
      </div>
    </div>
  );
}

function Paginacion({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{total} cotización{total === 1 ? '' : 'es'}</span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        >
          Anterior
        </button>
        <span className="px-2 py-1">Página {page} de {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}