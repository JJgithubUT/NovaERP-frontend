// inventario/InventarioModales.jsx
//
// Todos los modales de creación/edición del módulo. Cada uno recibe
// {isOpen, onClose, onSubmit} y NO llama al API directamente — onSubmit es
// una promesa que Inventario.jsx resuelve (así el modal solo sabe de UI y
// validación, y el padre sigue siendo dueño del estado, igual que en
// TabProductos/TabAjustes originales que reciben handlers por props).
//
// Si el onSubmit rechaza con {message, campo} (ver api.js), el modal muestra
// el error en el campo correspondiente o en un banner general.

import React, { useState, useEffect } from 'react';
import EntityCombo from './EntityCombo';
import { Input, BotonPrimario, BotonSecundario, BotonPeligro } from './UI';
import { MOTIVO_LABELS } from './inventario.utils';

function ModalShell({ title, onClose, children, footer, danger }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 px-4 py-14"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>✕</button>
        </div>
        <div className="flex flex-col gap-3.5 px-5 py-4 max-h-[65vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, error, help, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-slate-400">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{message}</div>;
}

/* ============================================================ Producto */
export function ModalCrearProducto({ isOpen, onClose, onSubmit, producto, onDarDeBaja }) {
  const editando = Boolean(producto);
  const [form, setForm] = useState({
    sku: '', nombre: '', descripcion: '', costo_referencia: '0', precio_venta: '0', stock_minimo: '0',
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        sku: producto?.sku || '',
        nombre: producto?.nombre || '',
        descripcion: producto?.descripcion || '',
        costo_referencia: producto?.costo_referencia ?? '0',
        precio_venta: producto?.precio_venta ?? '0',
        stock_minimo: producto?.stock_minimo ?? '0',
      });
      setErrors({}); setBanner(null);
    }
  }, [isOpen, producto]);

  if (!isOpen) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setSaving(true); setBanner(null); setErrors({});
    try {
      await onSubmit(form);
    } catch (err) {
      if (err.campo) setErrors({ [err.campo]: err.message }); else setBanner(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleBaja() {
    if (!window.confirm(`¿Dar de baja el producto ${producto.sku}? Se desactiva, no se borra su historial.`)) return;
    setSaving(true);
    try { await onDarDeBaja(); } catch (err) { setBanner(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell
      title={editando ? `Editar ${producto.sku}` : 'Nuevo producto'}
      onClose={onClose}
      footer={<>
        {editando && onDarDeBaja && (
          <BotonPeligro disabled={saving} onClick={handleBaja} className="mr-auto">Dar de baja</BotonPeligro>
        )}
        <BotonSecundario disabled={saving} onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario disabled={saving} onClick={handleSubmit}>{saving ? 'Guardando…' : 'Guardar'}</BotonPrimario>
      </>}
    >
      <ErrorBanner message={banner} />
      <Field label="SKU" error={errors.sku}><Input className="w-full" value={form.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
      <Field label="Nombre" error={errors.nombre}><Input className="w-full" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
      <Field label="Descripción" error={errors.descripcion}>
        <textarea
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-[#800000]/40"
          value={form.descripcion || ''}
          onChange={(e) => set('descripcion', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Costo de referencia" error={errors.costo_referencia}>
          <Input className="w-full" type="number" step="0.01" min="0" value={form.costo_referencia} onChange={(e) => set('costo_referencia', e.target.value)} />
        </Field>
        <Field label="Precio de venta" error={errors.precio_venta}>
          <Input className="w-full" type="number" step="0.01" min="0" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} />
        </Field>
      </div>
      <Field label="Stock mínimo" error={errors.stock_minimo} help="Genera una alerta cuando el stock cae a este nivel o menos.">
        <Input className="w-full" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} />
      </Field>
    </ModalShell>
  );
}

/* ============================================================ Almacén */
export function ModalCrearAlmacen({ isOpen, onClose, onSubmit, almacen, onDarDeBaja }) {
  const editando = Boolean(almacen);
  const [form, setForm] = useState({ nombre: '', ubicacion: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ nombre: almacen?.nombre || '', ubicacion: almacen?.ubicacion || '' });
      setErrors({}); setBanner(null);
    }
  }, [isOpen, almacen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    setSaving(true); setBanner(null); setErrors({});
    try { await onSubmit(form); }
    catch (err) { if (err.campo) setErrors({ [err.campo]: err.message }); else setBanner(err.message); }
    finally { setSaving(false); }
  }
  async function handleBaja() {
    if (!window.confirm(`¿Dar de baja el almacén ${almacen.nombre}?`)) return;
    setSaving(true);
    try { await onDarDeBaja(); } catch (err) { setBanner(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell
      title={editando ? `Editar ${almacen.nombre}` : 'Nuevo almacén'}
      onClose={onClose}
      footer={<>
        {editando && onDarDeBaja && <BotonPeligro disabled={saving} onClick={handleBaja} className="mr-auto">Dar de baja</BotonPeligro>}
        <BotonSecundario disabled={saving} onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario disabled={saving} onClick={handleSubmit}>{saving ? 'Guardando…' : 'Guardar'}</BotonPrimario>
      </>}
    >
      <ErrorBanner message={banner} />
      <Field label="Nombre" error={errors.nombre}>
        <Input className="w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </Field>
      <Field label="Ubicación" error={errors.ubicacion}>
        <Input className="w-full" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
      </Field>
    </ModalShell>
  );
}

/* ============================================================ Movimiento (RF-58) */
export function ModalCrearMovimiento({ isOpen, onClose, onSubmit }) {
  const [tipo, setTipo] = useState('entrada');
  const [producto, setProducto] = useState(null);
  const [almacen, setAlmacen] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTipo('entrada'); setProducto(null); setAlmacen(null);
      setCantidad(''); setCostoUnitario(''); setErrors({}); setBanner(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    setBanner(null); setErrors({});
    if (!producto) return setBanner('Selecciona un producto.');
    if (!almacen) return setBanner('Selecciona un almacén.');
    setSaving(true);
    try {
      await onSubmit({
        tipo, producto_id: producto.id, almacen_id: almacen.id,
        cantidad, costo_unitario: costoUnitario || undefined,
      });
    } catch (err) {
      if (err.campo) setErrors({ [err.campo]: err.message }); else setBanner(err.message);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell
      title="Nuevo movimiento"
      onClose={onClose}
      footer={<>
        <BotonSecundario disabled={saving} onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario disabled={saving} onClick={handleSubmit}>{saving ? 'Registrando…' : 'Registrar'}</BotonPrimario>
      </>}
    >
      <ErrorBanner message={banner} />
      <Field label="Tipo">
        <select
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/40"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </Field>
      <EntityCombo label="Producto" tipo="producto" value={producto} onChange={setProducto} />
      <EntityCombo label="Almacén" tipo="almacen" value={almacen} onChange={setAlmacen} />
      <Field label="Cantidad" error={errors.cantidad}>
        <Input className="w-full" type="number" step="0.01" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </Field>
      <Field label="Costo unitario (opcional)" error={errors.costo_unitario}>
        <Input className="w-full" type="number" step="0.01" min="0" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} />
      </Field>
      {tipo === 'salida' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Una salida se rechaza (422) si deja el stock por debajo de cero.
        </p>
      )}
    </ModalShell>
  );
}

/* ============================================================ Ajuste (RF-60) */
export function ModalCrearAjuste({ isOpen, onClose, onSubmit }) {
  const [motivo, setMotivo] = useState('conteo_fisico');
  const [producto, setProducto] = useState(null);
  const [almacen, setAlmacen] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMotivo('conteo_fisico'); setProducto(null); setAlmacen(null);
      setCantidad(''); setErrors({}); setBanner(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    setBanner(null); setErrors({});
    if (!producto) return setBanner('Selecciona un producto.');
    if (!almacen) return setBanner('Selecciona un almacén.');
    setSaving(true);
    try {
      await onSubmit({ motivo, producto_id: producto.id, almacen_id: almacen.id, cantidad });
    } catch (err) {
      if (err.campo) setErrors({ [err.campo]: err.message }); else setBanner(err.message);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell
      title="Nuevo ajuste"
      onClose={onClose}
      footer={<>
        <BotonSecundario disabled={saving} onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario disabled={saving} onClick={handleSubmit}>{saving ? 'Aplicando…' : 'Aplicar ajuste'}</BotonPrimario>
      </>}
    >
      <ErrorBanner message={banner} />
      <Field label="Motivo">
        <select
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/40"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        >
          {Object.entries(MOTIVO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <EntityCombo label="Producto" tipo="producto" value={producto} onChange={setProducto} />
      <EntityCombo label="Almacén" tipo="almacen" value={almacen} onChange={setAlmacen} />
      <Field label="Cantidad" error={errors.cantidad} help="Positiva suma stock, negativa lo resta. No puede ser cero.">
        <Input className="w-full" type="number" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </Field>
    </ModalShell>
  );
}

/* ============================================================ Transferencia (RF-61) */
export function ModalCrearTransferencia({ isOpen, onClose, onSubmit }) {
  const [producto, setProducto] = useState(null);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProducto(null); setOrigen(null); setDestino(null);
      setCantidad(''); setErrors({}); setBanner(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    setBanner(null); setErrors({});
    if (!producto) return setBanner('Selecciona un producto.');
    if (!origen || !destino) return setBanner('Selecciona almacén de origen y destino.');
    if (origen.id === destino.id) return setBanner('El almacén origen y destino no pueden ser el mismo.');
    setSaving(true);
    try {
      await onSubmit({
        producto_id: producto.id, almacen_origen_id: origen.id, almacen_destino_id: destino.id, cantidad,
      });
    } catch (err) {
      if (err.campo) setErrors({ [err.campo]: err.message }); else setBanner(err.message);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell
      title="Nueva transferencia"
      onClose={onClose}
      footer={<>
        <BotonSecundario disabled={saving} onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario disabled={saving} onClick={handleSubmit}>{saving ? 'Transfiriendo…' : 'Transferir'}</BotonPrimario>
      </>}
    >
      <ErrorBanner message={banner} />
      <EntityCombo label="Producto" tipo="producto" value={producto} onChange={setProducto} />
      <EntityCombo label="Almacén origen" tipo="almacen" value={origen} onChange={setOrigen} />
      <EntityCombo label="Almacén destino" tipo="almacen" value={destino} onChange={setDestino} />
      <Field label="Cantidad" error={errors.cantidad}>
        <Input className="w-full" type="number" step="0.01" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </Field>
      <p className="text-xs text-slate-400">Se valida stock suficiente en el origen antes de mover. Es atómica: o ambos movimientos se crean, o ninguno.</p>
    </ModalShell>
  );
}