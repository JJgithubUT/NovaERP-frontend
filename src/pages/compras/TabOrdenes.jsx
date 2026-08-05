// TabOrdenes.jsx
import { useEffect, useState } from 'react';
import { OrdenModal } from './ComprasModales';
import { ordenesApi, proveedoresApi, catalogosApi, extraerError } from './api';
import { ORDEN_ESTADOS, ESTADOS_CANCELABLES, ESTADOS_RECIBIBLES, formatCurrency } from './compras_utils';

export default function TabOrdenes({ onRecibir }) {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [ord, prov, prod] = await Promise.all([
        ordenesApi.listar(filtroEstado ? { estado: filtroEstado } : undefined),
        proveedoresApi.listar({ activo: true }),
        catalogosApi.productos({ activo: true }),
      ]);
      setOrdenes(ord.data.results ?? ord.data);
      setProveedores(prov.data.results ?? prov.data);
      setProductos(prod.data.results ?? prod.data);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [filtroEstado]);

  function nombreProveedor(id) {
    return proveedores.find((p) => p.id === id)?.razon_social || '—';
  }

  async function crear(data) {
    setSaving(true);
    setError('');
    try {
      await ordenesApi.crear(data);
      setModalOpen(false);
      cargar();
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setSaving(false);
    }
  }

  async function aprobar(orden) {
    try {
      await ordenesApi.aprobar(orden.id);
      cargar();
    } catch (err) {
      setError(extraerError(err));
    }
  }

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden ${orden.folio}? Lo ya recibido queda intacto.`)) return;
    try {
      await ordenesApi.cancelar(orden.id);
      cargar();
    } catch (err) {
      setError(extraerError(err));
    }
  }

  async function recibir(orden) {
    try {
      const { data } = await ordenesApi.detalle(orden.id);
      onRecibir(data);
    } catch (err) {
      setError(extraerError(err));
    }
  }

  const ordenesFiltradas = ordenes.filter(o => 
    !filtroEstado || o.estado === filtroEstado
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Órdenes de Compra</h2>
          <p className="text-slate-500 text-xs">Gestión de solicitudes, aprobaciones y seguimiento de compras.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <select
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none bg-white"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ORDEN_ESTADOS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Orden
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Folio</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">
                  Cargando órdenes de compra...
                </td>
              </tr>
            ) : ordenesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No se encontraron órdenes registradas.
                </td>
              </tr>
            ) : (
              ordenesFiltradas.map((r) => {
                const estadoInfo = ORDEN_ESTADOS[r.estado] || { label: r.estado, tone: 'gray' };
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-semibold text-slate-800">{r.folio}</td>
                    <td className="p-3 text-slate-700">{nombreProveedor(r.proveedor_id)}</td>
                    <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(r.total)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        estadoInfo.tone === 'green' ? 'bg-emerald-100 text-emerald-800' :
                        estadoInfo.tone === 'amber' ? 'bg-amber-100 text-amber-800' :
                        estadoInfo.tone === 'blue' ? 'bg-sky-100 text-sky-800' :
                        estadoInfo.tone === 'red' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {estadoInfo.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {r.estado === 'pendiente_aprobacion' && (
                          <button
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                            onClick={() => aprobar(r)}
                          >
                            Aprobar
                          </button>
                        )}
                        {ESTADOS_RECIBIBLES.has(r.estado) && (
                          <button
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                            onClick={() => recibir(r)}
                          >
                            Recibir
                          </button>
                        )}
                        {ESTADOS_CANCELABLES.has(r.estado) && (
                          <button
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                            onClick={() => cancelar(r)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <OrdenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={crear}
        proveedores={proveedores}
        productos={productos}
        saving={saving}
      />
    </div>
  );
}