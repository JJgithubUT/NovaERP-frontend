import React, { useState, useEffect } from 'react';
import {
  cotizacionesApi, useProductosCatalogo,
  money, ESTADOS, ESTADO_BADGE, clientesApi,
} from './cotizaciones.utils';

export function ModalShell({ titulo, subtitulo, onClose, ancho = 'max-w-lg', children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-xl w-full ${ancho} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-1">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{subtitulo || '\u00A0'}</p>
        {children}
      </div>
    </div>
  );
}

// Componente para modales (crear/editar cotización)
export function ClienteSelect({ value, onChange, required }) {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    clientesApi.listar({ page_size: 1000, ordering: 'razon_social' })
      .then(({ results }) => setClientes(results))
      .catch(() => setClientes([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
    >
      <option value="">{cargando ? 'Cargando clientes…' : 'Selecciona un cliente…'}</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.razon_social} {c.rfc_o_id_fiscal ? `(${c.rfc_o_id_fiscal})` : ''}
        </option>
      ))}
    </select>
  );
}

export function ProductoSelect({ productos, value, onChange, required }) {
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
    >
      <option value="">{productos.length ? 'Selecciona un producto…' : 'Cargando productos…'}</option>
      {productos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.sku} — {p.nombre}{p.activo === false ? ' (inactivo)' : ''}
        </option>
      ))}
    </select>
  );
}

function lineaVacia() {
  return { producto_id: '', descripcion: '', cantidad: '1', precio_unitario: '' };
}

export function CotizacionForm({ mode, cotizacion, onClose, onGuardado }) {
  const esEdicion = mode === 'editar';
  const { productos, porId } = useProductosCatalogo();
  const [clienteId, setClienteId] = useState(cotizacion?.cliente_id || '');
  const [oportunidadId, setOportunidadId] = useState(cotizacion?.oportunidad_id || '');
  const [descuentoPct, setDescuentoPct] = useState(cotizacion?.descuento_pct ?? '0');
  const [vigenteHasta, setVigenteHasta] = useState(cotizacion?.vigente_hasta || '');
  const [lineas, setLineas] = useState(
    esEdicion && cotizacion?.lineas?.length
      ? cotizacion.lineas.map((l) => ({
          producto_id: l.producto_id, descripcion: l.descripcion,
          cantidad: l.cantidad, precio_unitario: l.precio_unitario,
        }))
      : [lineaVacia()]
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const setLinea = (i, campo, valor) => {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  };
  const agregarLinea = () => setLineas((prev) => [...prev, lineaVacia()]);
  const quitarLinea = (i) => setLineas((prev) => prev.filter((_, idx) => idx !== i));

  const guardar = async (e) => {
    e.preventDefault();
    if (!esEdicion && !clienteId) {
      setError('Selecciona un cliente.');
      return;
    }
    setGuardando(true);
    setError('');

    const payloadLineas = lineas
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({
        producto_id: l.producto_id,
        descripcion: l.descripcion || undefined,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario === '' ? undefined : l.precio_unitario,
      }));

    const body = esEdicion
      ? { descuento_pct: descuentoPct, vigente_hasta: vigenteHasta || null, lineas: payloadLineas }
      : {
          cliente_id: clienteId,
          oportunidad_id: oportunidadId || undefined,
          descuento_pct: descuentoPct,
          vigente_hasta: vigenteHasta || undefined,
          lineas: payloadLineas,
        };

    try {
      if (esEdicion) await cotizacionesApi.editar(cotizacion.id, body);
      else await cotizacionesApi.crear(body);
      onGuardado();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell
      titulo={esEdicion ? `Editar Cotización ${cotizacion.folio}` : 'Nueva Cotización'}
      subtitulo="Captura las líneas de producto y las condiciones comerciales."
      onClose={onClose}
      ancho="max-w-2xl"
    >
      <form onSubmit={guardar} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        {!esEdicion && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Cliente *</label>
            <ClienteSelect value={clienteId} onChange={setClienteId} required />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {!esEdicion && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ID de oportunidad (opcional)</label>
              <input
                value={oportunidadId}
                onChange={(e) => setOportunidadId(e.target.value)}
                placeholder="UUID de la oportunidad relacionada"
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
              />
            </div>
          )}
          {esEdicion && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Estado actual</label>
              <div className="flex items-center h-[34px]">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[cotizacion.estado] || 'bg-slate-100 text-slate-600'}`}>
                  {ESTADOS.find((e) => e.value === cotizacion.estado)?.label || cotizacion.estado}
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400 -mt-1">
          El estado se calcula solo: nace en Borrador o Pendiente de aprobación según el descuento vs. el
          máximo del tenant. Para pasar a Aprobada o Rechazada usa "Resolver" desde la tabla.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Descuento (%)</label>
            <input
              type="number" min="0" max="100" step="0.01"
              value={descuentoPct}
              onChange={(e) => setDescuentoPct(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Vigente hasta</label>
            <input
              type="date"
              value={vigenteHasta || ''}
              onChange={(e) => setVigenteHasta(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-700">Líneas (Productos)</label>
            <button type="button" onClick={agregarLinea} className="text-red-800 text-xs font-medium hover:underline">
              + Agregar línea
            </button>
          </div>
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <ProductoSelect
                    productos={productos}
                    value={l.producto_id}
                    onChange={(pid) => {
                      setLinea(i, 'producto_id', pid);
                      const prod = porId(pid);
                      if (prod && !l.precio_unitario) setLinea(i, 'precio_unitario', prod.precio_venta);
                    }}
                  />
                </div>
                <input
                  placeholder="Descripción (opcional)"
                  value={l.descripcion}
                  onChange={(e) => setLinea(i, 'descripcion', e.target.value)}
                  className="col-span-3 text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
                <input
                  placeholder="Cantidad"
                  type="number" min="0" step="0.001"
                  value={l.cantidad}
                  onChange={(e) => setLinea(i, 'cantidad', e.target.value)}
                  className="col-span-2 text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
                <input
                  placeholder="Precio"
                  type="number" min="0" step="0.0001"
                  value={l.precio_unitario}
                  onChange={(e) => setLinea(i, 'precio_unitario', e.target.value)}
                  className="col-span-2 text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => quitarLinea(i)}
                  disabled={lineas.length === 1}
                  className="col-span-1 text-red-600 text-[11px] hover:underline disabled:opacity-30"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar Cambios' : 'Crear Cotización'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ResolverModal({ cotizacion, onClose, onResuelta }) {
  const [decision, setDecision] = useState('aprobar');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    setEnviando(true);
    setError('');
    try {
      await cotizacionesApi.resolver(cotizacion.id, decision);
      onResuelta();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalShell
      titulo={`Resolver Cotización ${cotizacion.folio}`}
      subtitulo="Aprueba o rechaza esta cotización."
      onClose={onClose}
      ancho="max-w-md"
    >
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}
        {cotizacion.vencida && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs">
            Esta cotización está vencida; solo puede rechazarse.
          </div>
        )}
        <div className="text-xs text-slate-600">
          Total: <span className="font-semibold text-slate-800">{money(cotizacion.total)}</span> · Descuento: {Number(cotizacion.descuento_pct)}%
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="radio" name="decision"
              checked={decision === 'aprobar'}
              onChange={() => setDecision('aprobar')}
              className="text-red-800 focus:ring-red-800"
            />
            Aprobar
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="radio" name="decision"
              checked={decision === 'rechazar'}
              onChange={() => setDecision('rechazar')}
              className="text-red-800 focus:ring-red-800"
            />
            Rechazar
          </label>
        </div>
        <div className="flex justify-end space-x-2 pt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando || (cotizacion.vencida && decision === 'aprobar')}
            className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium disabled:opacity-50 ${
              decision === 'aprobar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-800 hover:bg-red-900'
            }`}
          >
            {enviando ? 'Enviando…' : decision === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}