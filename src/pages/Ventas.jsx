import React, { useState } from 'react';

// Subcomponentes del Módulo de Ventas
import TabClientes from './ventas/TabClientes';
import TabPipeline from './ventas/TabPipeline';
import TabCotizaciones from './ventas/TabCotizaciones';
import TabPedidos from './ventas/TabPedidos';
import TabFacturas from './ventas/TabFacturas';
import TabReportes from './ventas/TabReportes';

export default function Ventas() {
  // Inicializamos en 'clientes' como punto de partida lógico del flujo
  const [activeTab, setActiveTab] = useState('clientes');

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Encabezado + menú de pestañas: fijos al hacer scroll */}
      <div className="sticky top-0 z-20 bg-slate-50 px-6 pt-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Módulo de Ventas</h1>
          <p className="text-slate-500 text-sm">
            Administración comercial, CRM, pedidos y facturación.
          </p>
        </div>

        {/* Menú de Pestañas con orden jerárquico comercial */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-lg shadow-sm space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'clientes'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Clientes
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Pipeline CRM
          </button>

          <button
            onClick={() => setActiveTab('cotizaciones')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'cotizaciones'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Cotizaciones
          </button>

          <button
            onClick={() => setActiveTab('pedidos')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'pedidos'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Pedidos
          </button>

          <button
            onClick={() => setActiveTab('facturas')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'facturas'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Facturas
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'reportes'
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Reportes
          </button>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="px-6 pb-6">
        <div className="bg-white p-6 rounded-b-lg shadow-sm border border-t-0 border-slate-200">
          {activeTab === 'clientes' && <TabClientes />}
          {activeTab === 'pipeline' && <TabPipeline />}
          {activeTab === 'cotizaciones' && <TabCotizaciones />}
          {activeTab === 'pedidos' && <TabPedidos />}
          {activeTab === 'facturas' && <TabFacturas />}
          {activeTab === 'reportes' && <TabReportes />}
        </div>
      </div>
    </div>
  );
}