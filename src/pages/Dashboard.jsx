import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  ShieldCheck, 
  Activity, 
  RefreshCw,
  ShoppingBag,
  Boxes,
  UserCheck,
  FileBarChart
} from 'lucide-react';

export default function Dashboard() {
  const [resumen, setResumen] = useState({
    totalClientes: 0,
    oportunidadesAbiertas: 0,
    montoPipeline: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [tenantActual, setTenantActual] = useState('Principal');
  const [nombreUsuario, setNombreUsuario] = useState('Administrador');

  // Obtener datos dinámicos del usuario y sucursal/tenant guardados al iniciar sesión
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user_info'));
      if (storedUser) {
        if (storedUser.nombre) setNombreUsuario(storedUser.nombre);
        if (storedUser.tenant || storedUser.empresa || storedUser.sucursal) {
          setTenantActual(storedUser.tenant || storedUser.empresa || storedUser.sucursal);
        }
      }
    } catch (e) {
      console.error("Error al leer info del usuario", e);
    }
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-Tenant': tenantActual
    };
  };

  const cargarDatosDashboard = async () => {
    setCargando(true);
    try {
      const [resClientes, resOps] = await Promise.all([
        fetch('/api/ventas/clientes/', { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
        fetch('/api/ventas/oportunidades/?estado=abierta', { headers: getAuthHeaders() }).catch(() => ({ ok: false }))
      ]);

      let clientesCount = 0;
      let opsCount = 0;
      let montoTotal = 0;

      if (resClientes.ok) {
        const dataClientes = await resClientes.json();
        const listaC = Array.isArray(dataClientes) ? dataClientes : dataClientes.results || [];
        clientesCount = listaC.length;
      }

      if (resOps.ok) {
        const dataOps = await resOps.json();
        const listaO = Array.isArray(dataOps) ? dataOps : dataOps.results || [];
        opsCount = listaO.length;
        montoTotal = listaO.reduce((acc, op) => acc + (parseFloat(op.valor_estimado) || 0), 0);
      }

      setResumen({
        totalClientes: clientesCount,
        oportunidadesAbiertas: opsCount,
        montoPipeline: montoTotal,
      });
    } catch (err) {
      console.error('Error al cargar métricas del dashboard:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosDashboard();
  }, [tenantActual]);

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      
      {/* Banner de Bienvenida */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--color-guinda-base,#73030D)] to-[#990412] p-6 sm:p-8 rounded-2xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-white/90 mb-3 border border-white/10">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Sistema Conectado y Seguro</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ¡Hola, {nombreUsuario}!
          </h2>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Bienvenido al panel principal de <span className="font-semibold text-white">novaERP</span>. Aquí puedes supervisar la actividad comercial y el estado general de tus sucursales.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-start md:items-end bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-white/70 uppercase tracking-wider font-semibold">
            <Building2 size={14} /> Sucursal / Empresa
          </div>
          <span className="text-lg font-bold text-white mt-0.5">{tenantActual}</span>
          <button 
            onClick={cargarDatosDashboard}
            className="mt-2 flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={cargando ? "animate-spin" : ""} />
            Actualizar indicadores
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Tarjetas de Métricas Principales (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-50 text-[var(--color-guinda-base,#73030D)] rounded-xl group-hover:scale-110 transition-transform">
              <Users size={22} />
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Al día
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Totales</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
              {cargando ? <span className="animate-pulse text-slate-300">...</span> : resumen.totalClientes}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Compradores registrados en el sistema</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-50 text-[var(--color-guinda-base,#73030D)] rounded-xl group-hover:scale-110 transition-transform">
              <TrendingUp size={22} />
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-[var(--color-guinda-base,#73030D)] bg-red-50 px-2.5 py-1 rounded-full">
              En proceso
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Oportunidades Abiertas</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
              {cargando ? <span className="animate-pulse text-slate-300">...</span> : resumen.oportunidadesAbiertas}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Ventas y negociaciones vigentes</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-50 text-[var(--color-guinda-base,#73030D)] rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign size={22} />
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              MXN
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monto Estimado en Ventas</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
              {cargando ? <span className="animate-pulse text-slate-300">...</span> : `$${resumen.montoPipeline.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Valor proyectado de negociaciones</p>
          </div>
        </div>

      </div>

      {/* Sección de los 4 Módulos del ERP y Estado del Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Los 4 Módulos Principales */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/85 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Módulos del Sistema</h3>
          <p className="text-xs text-slate-500 mb-5">
            Accede rápidamente o consulta las áreas operativas configuradas en tu menú lateral:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Ventas */}
            <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:border-[var(--color-guinda-base,#73030D)] hover:bg-red-50/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm text-[var(--color-guinda-base,#73030D)] border border-slate-100">
                  <ShoppingBag size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">1. Ventas</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Administra tu cartera de clientes, da seguimiento al embudo comercial (pipeline) y genera cotizaciones.
              </p>
            </div>

            {/* Inventario */}
            <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:border-[var(--color-guinda-base,#73030D)] hover:bg-red-50/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm text-[var(--color-guinda-base,#73030D)] border border-slate-100">
                  <Boxes size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">2. Inventario</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Controla existencias de productos, entradas, salidas de almacén y mercancía disponible en tiendas.
              </p>
            </div>

            {/* Recursos Humanos */}
            <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:border-[var(--color-guinda-base,#73030D)] hover:bg-red-50/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm text-[var(--color-guinda-base,#73030D)] border border-slate-100">
                  <UserCheck size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">3. Recursos Humanos</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gestión del personal, expedientes de colaboradores, control de asistencia y estructura organizacional.
              </p>
            </div>

            {/* Reportes */}
            <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:border-[var(--color-guinda-base,#73030D)] hover:bg-red-50/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm text-[var(--color-guinda-base,#73030D)] border border-slate-100">
                  <FileBarChart size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">4. Reportes</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consulta estadísticas financieras, análisis de rendimiento y reportes ejecutivos generales del negocio.
              </p>
            </div>

          </div>
        </div>

        {/* Panel de Estado General */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} className="text-[var(--color-guinda-base,#73030D)]" />
              <h3 className="font-bold text-slate-900 text-base">Estado del Sistema</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">Información técnica y conexión con el servidor.</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Plataforma</span>
                <span className="font-semibold text-slate-900">novaERP Cloud</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Conexión con Base de Datos</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  En línea
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-2">
                <span className="text-slate-500 font-medium">Versión Actual</span>
                <span className="font-semibold text-slate-900">v1.0.0</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center font-medium">
            novaERP &copy; 2026 &bull; Todos los derechos reservados
          </div>
        </div>

      </div>
    </div>
  );
}