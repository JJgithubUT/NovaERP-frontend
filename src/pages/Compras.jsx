// Compras.jsx — punto de entrada del módulo de Compras.
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Tabs, Button } from './compras/UI';
import { ConfigAprobacionModal } from './compras/ComprasModales';
import { configAprobacionApi, extraerError } from './compras/api';
import TabProveedores from './compras/TabProveedores';
import TabOrdenes from './compras/TabOrdenes';
import TabRecepciones from './compras/TabRecepciones';
import TabCuentasPorPagar from './compras/TabCuentasporpagor';

const TABS = [
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'ordenes', label: 'Órdenes de compra' },
  { key: 'recepciones', label: 'Recepciones' },
  { key: 'cxp', label: 'Cuentas por pagar' },
];

export default function Compras() {
  const [active, setActive] = useState('proveedores');
  const [ordenParaRecibir, setOrdenParaRecibir] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  function notificar(tipo, mensaje) {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  }

  async function abrirConfig() {
    try {
      const { data } = await configAprobacionApi.obtener();
      setConfig(data);
      setConfigOpen(true);
    } catch (err) {
      setError(extraerError(err));
      notificar('error', extraerError(err));
    }
  }

  async function guardarConfig(data) {
    setSavingConfig(true);
    try {
      await configAprobacionApi.actualizar(data);
      setConfigOpen(false);
      notificar('success', 'Umbral de aprobación actualizado.');
    } catch (err) {
      setError(extraerError(err));
      notificar('error', extraerError(err));
    } finally {
      setSavingConfig(false);
    }
  }

  function handleRecibir(orden) {
    setOrdenParaRecibir(orden);
    setActive('recepciones');
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Encabezado fijo superior idéntico a Inventario */}
      <div className="sticky top-0 z-20 bg-slate-50 px-6 pt-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Compras</h1>
            <p className="text-slate-500 text-sm">
              Proveedores, órdenes de compra, recepción de mercancía y cuentas por pagar.
            </p>
          </div>
          <button
            onClick={abrirConfig}
            className="bg-white hover:bg-red-50 text-[#800000] px-4 py-2 rounded-lg text-xs font-semibold transition-colors border border-[#800000] shadow-sm flex items-center gap-1.5"
          >
            <Settings size={14} /> Umbral de aprobación
          </button>
        </div>

        {/* Pestañas idénticas al estilo visual de Inventario */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-lg shadow-sm space-x-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                active === tab.key
                  ? 'border-[#800000] text-[#800000] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenedor del contenido con el fondo blanco e idénticos márgenes */}
      <div className="px-6 pb-6">
        <div className="bg-white p-6 rounded-b-lg shadow-sm border border-t-0 border-slate-200 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
              <strong>Aviso:</strong> {error}
            </div>
          )}

          {active === 'proveedores' && <TabProveedores />}
          {active === 'ordenes' && <TabOrdenes onRecibir={handleRecibir} />}
          {active === 'recepciones' && (
            <TabRecepciones
              ordenParaRecibir={ordenParaRecibir}
              onRecibido={() => setOrdenParaRecibir(null)}
            />
          )}
          {active === 'cxp' && <TabCuentasPorPagar />}
        </div>
      </div>

      <ConfigAprobacionModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSubmit={guardarConfig}
        initial={config}
        saving={savingConfig}
      />

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.mensaje}
        </div>
      )}
    </div>
  );
}