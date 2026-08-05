import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

import VentasPorPeriodo from './reportes/VentasPorPeriodo';
import RankingClientes from './reportes/RankingClientes';
import RankingProductos from './reportes/RankingProductos';
import Embudo from './reportes/Embudo';
import Cartera from './reportes/Cartera';
import Vendedores from './reportes/Vendedores';

const SUBTABS = [
  { key: 'periodo', label: 'Ventas por periodo', Componente: VentasPorPeriodo },
  { key: 'clientes', label: 'Ranking de clientes', Componente: RankingClientes },
  { key: 'productos', label: 'Ranking de productos', Componente: RankingProductos },
  { key: 'embudo', label: 'Embudo comercial', Componente: Embudo },
  { key: 'cartera', label: 'Cartera', Componente: Cartera },
  { key: 'vendedores', label: 'Desempeño de vendedores', Componente: Vendedores },
];

/**
 * TabReportes — se monta como una pestaña más dentro de Ventas.jsx, igual
 * que TabClientes, TabPipeline, etc.
 *
 * Responsabilidad propia (que no le corresponde a cada reporte individual):
 * leer GET /api/core/me/ UNA sola vez y pasar `permisos` hacia abajo. Así
 * cada uno de los 6 componentes de reporte solo necesita un array de
 * strings — no le importa de dónde salió ni cómo se gestiona la sesión.
 *
 * Requiere ventas:reportes:leer para siquiera ver esta pestaña (RV-*
 * comparten ese permiso). Si el usuario no lo tiene, el backend igual
 * respondería 403 en cada llamada — aquí lo cortamos antes, para no mostrar
 * un sub-menú de reportes que van a fallar todos.
 */
export default function TabReportes() {
  const [permisos, setPermisos] = useState(null); // null = aún cargando
  const [error, setError] = useState(null);
  const [subTab, setSubTab] = useState('periodo');

  useEffect(() => {
    let activo = true;
    // Sin "/api/" — el baseURL de axios ya lo incluye (ver nota en reportes.js).
    api
      .get('/core/me/')
      .then((res) => {
        if (!activo) return;
        const codigos = (res.data.permisos ?? []).map((p) => p.codigo);
        // es_admin es un atajo: el rol de sistema puede todo, aunque no
        // aparezca listado permiso por permiso.
        if (res.data.es_admin) {
          setPermisos(['ventas:reportes:leer', 'ventas:reportes:exportar', 'ventas:pipeline:ver_todo', ...codigos]);
        } else {
          setPermisos(codigos);
        }
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.response?.data?.detail ?? 'No se pudo cargar tu información de usuario.');
        setPermisos([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (permisos === null) {
    return <div className="text-sm text-slate-400 py-8 text-center">Cargando…</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-md px-3 py-2">
        {error}
      </div>
    );
  }

  if (!permisos.includes('ventas:reportes:leer')) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md px-3 py-2">
        No tienes permiso para ver los reportes de ventas.
      </div>
    );
  }

  const ComponenteActivo = SUBTABS.find((t) => t.key === subTab)?.Componente;

  return (
    <div>
      {/* Sub-menú de reportes, mismo patrón visual que las pestañas de Ventas.jsx
          pero un nivel más chico (border-b más delgado, sin mayúsculas forzadas). */}
      <div className="flex border-b border-slate-200 mb-4 space-x-4 overflow-x-auto">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              subTab === t.key
                ? 'border-[#800000] text-[#800000] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {ComponenteActivo && <ComponenteActivo permisos={permisos} />}
    </div>
  );
}