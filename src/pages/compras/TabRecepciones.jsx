// TabRecepciones.jsx
import { useEffect, useState } from 'react';
import { RecepcionModal } from './ComprasModales';
import { recepcionesApi, catalogosApi, ordenesApi, extraerError } from './api';
import { formatDateTime } from './compras_utils';

export default function TabRecepciones({ ordenParaRecibir, onRecibido }) {
  const [recepciones, setRecepciones] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [rec, alm, ord] = await Promise.all([
        recepcionesApi.listar(),
        catalogosApi.almacenes({ activo: true }),
        ordenesApi.listar(),
      ]);
      setRecepciones(rec.data.results ?? rec.data);
      setAlmacenes(alm.data.results ?? alm.data);
      setOrdenes(ord.data.results ?? ord.data);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function folioOrden(id) {
    return ordenes.find((o) => o.id === id)?.folio || id?.slice(0, 8) || '—';
  }

  async function crearRecepcion(data) {
    setSaving(true);
    setError('');
    try {
      await recepcionesApi.crear(data);
      onRecibido();
      cargar();
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Recepciones de Mercancía</h2>
          <p className="text-slate-500 text-xs">Registro histórico de entradas de inventario basadas en órdenes de compra.</p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">ID Recepción</th>
              <th className="p-3">Orden de Compra</th>
              <th className="p-3">Líneas</th>
              <th className="p-3">Fecha de Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">
                  Cargando recepciones...
                </td>
              </tr>
            ) : recepciones.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
                  No se encontraron recepciones registradas.
                </td>
              </tr>
            ) : (
              recepciones.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-semibold text-slate-800">{r.id.slice(0, 8)}</td>
                  <td className="p-3 font-mono text-slate-700">{folioOrden(r.orden_id)}</td>
                  <td className="p-3 text-slate-700">{r.lineas.length} producto(s)</td>
                  <td className="p-3 text-slate-600">{formatDateTime(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecepcionModal
        open={!!ordenParaRecibir}
        onClose={onRecibido}
        onSubmit={crearRecepcion}
        orden={ordenParaRecibir}
        almacenes={almacenes}
        saving={saving}
      />
    </div>
  );
}