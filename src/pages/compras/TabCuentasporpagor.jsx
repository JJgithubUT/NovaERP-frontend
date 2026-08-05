// TabCuentasPorPagar.jsx
import { useEffect, useState } from 'react';
import { cuentasPorPagarApi, proveedoresApi, extraerError } from './api';
import { formatCurrency, formatDateTime } from './compras_utils';

export default function TabCuentasPorPagar() {
  const [cuentas, setCuentas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cxp, prov] = await Promise.all([cuentasPorPagarApi.listar(), proveedoresApi.listar()]);
        setCuentas(cxp.data.results ?? cxp.data);
        setProveedores(prov.data.results ?? prov.data);
      } catch (err) {
        setError(extraerError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function nombreProveedor(id) {
    return proveedores.find((p) => p.id === id)?.razon_social || '—';
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
          <h2 className="text-xl font-bold text-red-800">Cuentas por Pagar</h2>
          <p className="text-slate-500 text-xs">Solo lectura — generadas automáticamente en cada recepción de mercancía.</p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Origen</th>
              <th className="p-3 text-right">Monto Original</th>
              <th className="p-3 text-right">Saldo Pendiente</th>
              <th className="p-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">
                  Cargando cuentas por pagar...
                </td>
              </tr>
            ) : cuentas.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No se encontraron cuentas por pagar registradas.
                </td>
              </tr>
            ) : (
              cuentas.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">{nombreProveedor(r.proveedor_id)}</td>
                  <td className="p-3 text-slate-600">{r.origen_tipo || '—'}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(r.monto_original)}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(r.saldo)}</td>
                  <td className="p-3 text-slate-600">{formatDateTime(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}