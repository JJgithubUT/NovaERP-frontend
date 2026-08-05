// ComprasModales.jsx — formularios modales del módulo de Compras.
import { useEffect, useState } from 'react';
import { Modal, Field, inputClass, Button, Badge, Table } from './UI';
import { toDecimalString, ORDEN_ESTADOS, formatCurrency, cantidadPendiente } from './compras_utils';

// ----------------------------------------------------------------- Proveedor

export function ProveedorModal({ open, onClose, onSubmit, initial, saving }) {
  const [form, setForm] = useState(empty());

  useEffect(() => {
    if (open) setForm(initial ? { ...empty(), ...initial } : empty());
  }, [open, initial]);

  function empty() {
    return { rfc_o_id_fiscal: '', razon_social: '', correo: '', telefono: '' };
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal open={open} title={initial ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="RFC o ID fiscal">
          <input
            className={inputClass}
            value={form.rfc_o_id_fiscal}
            onChange={(e) => setForm({ ...form, rfc_o_id_fiscal: e.target.value })}
            required
          />
        </Field>
        <Field label="Razón social">
          <input
            className={inputClass}
            value={form.razon_social}
            onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
            required
          />
        </Field>
        <Field label="Correo">
          <input
            type="email"
            className={inputClass}
            value={form.correo || ''}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputClass}
            value={form.telefono || ''}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Historial de un proveedor (RF-51): órdenes, recepciones y CxP en un solo
// payload — solo lectura.
export function ProveedorHistorialModal({ open, onClose, historial, loading }) {
  return (
    <Modal open={open} title={historial ? `Historial — ${historial.razon_social}` : 'Historial'} onClose={onClose} wide>
      {loading || !historial ? (
        <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Órdenes de compra</h4>
            <Table
              rows={historial.ordenes}
              columns={[
                { key: 'folio', header: 'Folio' },
                { key: 'estado', header: 'Estado', render: (r) => <Badge estado={r.estado} catalogo={ORDEN_ESTADOS} /> },
                { key: 'total', header: 'Total', render: (r) => formatCurrency(r.total) },
              ]}
              emptyLabel="Sin órdenes."
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Recepciones</h4>
            <Table
              rows={historial.recepciones}
              columns={[
                { key: 'id', header: 'ID', render: (r) => r.id.slice(0, 8) },
                { key: 'orden_id', header: 'Orden', render: (r) => r.orden_id.slice(0, 8) },
                { key: 'created_at', header: 'Fecha', render: (r) => new Date(r.created_at).toLocaleDateString('es-MX') },
              ]}
              emptyLabel="Sin recepciones."
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Cuentas por pagar</h4>
            <Table
              rows={historial.cuentas_por_pagar}
              columns={[
                { key: 'monto_original', header: 'Monto original', render: (r) => formatCurrency(r.monto_original) },
                { key: 'saldo', header: 'Saldo', render: (r) => formatCurrency(r.saldo) },
              ]}
              emptyLabel="Sin cuentas por pagar."
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

// -------------------------------------------------------------- Orden compra

export function OrdenModal({ open, onClose, onSubmit, proveedores, productos, saving }) {
  const [proveedorId, setProveedorId] = useState('');
  const [lineas, setLineas] = useState([]);

  useEffect(() => {
    if (open) {
      setProveedorId('');
      setLineas([]);
    }
  }, [open]);

  function actualizar(i, campo, valor) {
    const copia = [...lineas];
    copia[i] = { ...copia[i], [campo]: valor };
    setLineas(copia);
  }

  function agregar() {
    setLineas([...lineas, { producto_id: '', cantidad: '1', costo_unitario: '0' }]);
  }

  function quitar(i) {
    setLineas(lineas.filter((_, idx) => idx !== i));
  }

  const total = lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0), 0);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      proveedor_id: proveedorId,
      lineas: lineas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: toDecimalString(l.cantidad),
        costo_unitario: toDecimalString(l.costo_unitario),
      })),
    });
  }

  return (
    <Modal open={open} title="Nueva orden de compra" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <Field label="Proveedor">
          <select
            className={inputClass}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
          >
            <option value="">Selecciona un proveedor…</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.razon_social}
              </option>
            ))}
          </select>
        </Field>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Líneas</span>
            <Button type="button" variant="secondary" onClick={agregar} className="px-2 py-1 text-xs">
              + Agregar línea
            </Button>
          </div>
          <div className="space-y-2">
            {lineas.map((l, i) => {
              const producto = productos.find((p) => p.id === l.producto_id);
              const importe = (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0);
              return (
                <div key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="grid grid-cols-12 gap-2">
                    <select
                      className={`${inputClass} col-span-6`}
                      value={l.producto_id}
                      onChange={(e) => {
                        const p = productos.find((pr) => pr.id === e.target.value);
                        actualizar(i, 'producto_id', e.target.value);
                        if (p) actualizar(i, 'costo_unitario', String(p.costo_referencia ?? l.costo_unitario));
                      }}
                      required
                    >
                      <option value="">Producto…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="Cantidad"
                      className={`${inputClass} col-span-2`}
                      value={l.cantidad}
                      onChange={(e) => actualizar(i, 'cantidad', e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Costo unitario"
                      className={`${inputClass} col-span-3`}
                      value={l.costo_unitario}
                      onChange={(e) => actualizar(i, 'costo_unitario', e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      className="col-span-1 text-xs font-medium text-rose-600 hover:text-rose-800"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-1 text-right text-xs text-slate-500">
                    Importe: {importe.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </div>
                </div>
              );
            })}
            {lineas.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                Sin líneas — agrega al menos una.
              </p>
            )}
          </div>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Total: <strong>{total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong> — si
          supera el umbral de aprobación del tenant, la orden nace en <em>pendiente de aprobación</em> en vez
          de <em>enviada</em>.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || lineas.length === 0}>
            {saving ? 'Guardando…' : 'Crear orden'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------- Recepción

export function RecepcionModal({ open, onClose, onSubmit, orden, almacenes, saving }) {
  const [almacenId, setAlmacenId] = useState('');
  const [cantidades, setCantidades] = useState({});

  useEffect(() => {
    if (open && orden) {
      setAlmacenId('');
      const init = {};
      orden.lineas.forEach((l) => {
        const pendiente = cantidadPendiente(l);
        init[l.id] = pendiente > 0 ? String(pendiente) : '0';
      });
      setCantidades(init);
    }
  }, [open, orden]);

  if (!orden) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const lineas = orden.lineas
      .filter((l) => Number(cantidades[l.id]) > 0)
      .map((l) => ({
        orden_compra_linea_id: l.id,
        cantidad: toDecimalString(cantidades[l.id]),
        costo_unitario: l.costo_unitario,
      }));
    onSubmit({ orden_id: orden.id, almacen_id: almacenId, lineas });
  }

  return (
    <Modal open={open} title={`Recibir mercancía — orden ${orden.folio}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <Field label="Almacén">
          <select className={inputClass} value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} required>
            <option value="">Selecciona un almacén…</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Field>

        <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Producto</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Pendiente</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">A recibir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orden.lineas.map((l) => {
                const pendiente = cantidadPendiente(l);
                return (
                  <tr key={l.id}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{l.producto_id}</td>
                    <td className="px-3 py-2">{pendiente}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={pendiente}
                        className={inputClass}
                        value={cantidades[l.id] ?? ''}
                        onChange={(e) => setCantidades({ ...cantidades, [l.id]: e.target.value })}
                        disabled={pendiente <= 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          La recepción es irreversible en su efecto de stock: suma inventario y crea la cuenta por pagar. No
          hay "deshacer recepción" — una corrección se hace con un ajuste de inventario.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar recepción'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------ Config aprob.

export function ConfigAprobacionModal({ open, onClose, onSubmit, initial, saving }) {
  const [umbral, setUmbral] = useState('0');

  useEffect(() => {
    if (open && initial) setUmbral(initial.umbral_monto ?? '0');
  }, [open, initial]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ umbral_monto: toDecimalString(umbral) ?? '0' });
  }

  return (
    <Modal open={open} title="Umbral de aprobación" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Monto umbral">
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
          />
        </Field>
        <p className="mb-3 text-xs text-slate-500">
          Toda orden cuyo total supere este monto nace en "pendiente de aprobación" y no puede recibirse
          hasta ser aprobada.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}