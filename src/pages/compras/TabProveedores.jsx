// TabProveedores.jsx
import { useEffect, useState } from 'react';
import { ProveedorModal, ProveedorHistorialModal } from './ComprasModales';
import { proveedoresApi, extraerError } from './api';
import { formatCurrency } from './compras_utils';

export default function TabProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial, setHistorial] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await proveedoresApi.listar(busqueda ? { search: busqueda } : undefined);
      setProveedores(data.results ?? data);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(data) {
    setSaving(true);
    setError('');
    try {
      if (editando) {
        await proveedoresApi.editar(editando.id, data);
      } else {
        await proveedoresApi.crear(data);
      }
      setModalOpen(false);
      setEditando(null);
      cargar();
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setSaving(false);
    }
  }

  async function darDeBaja(proveedor) {
    if (!window.confirm(`¿Deseas desactivar al proveedor "${proveedor.razon_social}"?`)) return;
    try {
      await proveedoresApi.darDeBaja(proveedor.id);
      cargar();
    } catch (err) {
      setError(extraerError(err));
    }
  }

  async function verHistorial(proveedor) {
    setHistorialOpen(true);
    setHistorialLoading(true);
    try {
      const { data } = await proveedoresApi.historial(proveedor.id);
      setHistorial(data);
    } catch (err) {
      setError(extraerError(err));
      setHistorialOpen(false);
    } finally {
      setHistorialLoading(false);
    }
  }

  const proveedoresFiltrados = proveedores.filter(p =>
    p.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rfc_o_id_fiscal?.toLowerCase().includes(busqueda.toLowerCase())
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
          <h2 className="text-xl font-bold text-red-800">Proveedores</h2>
          <p className="text-slate-500 text-xs">Catálogo de proveedores, datos fiscales y contacto.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por Razón Social o RFC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cargar()}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
        </div>

        <button
          onClick={() => {
            setEditando(null);
            setModalOpen(true);
          }}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Proveedor
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Razón Social</th>
              <th className="p-3">RFC / ID Fiscal</th>
              <th className="p-3">Contacto</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">
                  Cargando catálogo desde la base de datos...
                </td>
              </tr>
            ) : proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No se encontraron proveedores registrados.
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">{r.razon_social}</td>
                  <td className="p-3 font-mono text-slate-600">{r.rfc_o_id_fiscal || 'Sin RFC'}</td>
                  <td className="p-3 text-slate-600">
                    <div>{r.correo || 'Sin correo'}</div>
                    <div className="text-[10px] text-slate-400">{r.telefono || 'Sin teléfono'}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => verHistorial(r)}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                      >
                        Historial
                      </button>
                      <button
                        onClick={() => {
                          setEditando(r);
                          setModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                      >
                        Editar
                      </button>
                      {r.activo && (
                        <button
                          onClick={() => darDeBaja(r)}
                          className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
                        >
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProveedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={guardar}
        initial={editando}
        saving={saving}
      />
      <ProveedorHistorialModal
        open={historialOpen}
        onClose={() => setHistorialOpen(false)}
        historial={historial}
        loading={historialLoading}
      />
    </div>
  );
}