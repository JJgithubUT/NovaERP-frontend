import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Package
} from 'lucide-react';

const Dashboard = () => {
  const metrics = [
    { title: 'Ventas del Mes', value: '$128,450.00', change: '+12.4%', isPositive: true, icon: DollarSign },
    { title: 'Pedidos Pendientes', value: '34', change: '-2.1%', isPositive: true, icon: ShoppingBag },
    { title: 'Alertas de Stock', value: '8 ítems', change: '+3 critical', isPositive: false, icon: AlertTriangle },
    { title: 'Facturación Emitida', value: '142 CFDI', change: '+8.5%', isPositive: true, icon: TrendingUp },
  ];

  const recentLogs = [
    { time: '10:42:15', event: 'Factura F-8492 generada exitosamente (UUID verificado)', type: 'INFO' },
    { time: '10:38:00', event: 'Orden de compra PO-1022 aprobada por Dpto. Finanzas', type: 'SUCCESS' },
    { time: '10:15:30', event: 'Stock bajo detectado en Producto SK-9930 (Almacén Central)', type: 'WARN' },
    { time: '09:50:11', event: 'Nuevo cliente registrado: Logística del Norte S.A.', type: 'INFO' },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado de Página */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-slate-100 tracking-tight">PANEL OPERATIVO GLOBAL</h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">Resumen analítico y métricas de rendimiento en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-mono rounded text-slate-300 transition-colors">
            Exportar REPORTE (CSV)
          </button>
        </div>
      </div>

      {/* Grid de Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase">{m.title}</span>
                <div className="p-1.5 bg-slate-950 border border-slate-800 rounded text-emerald-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-slate-100">{m.value}</div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-mono">
                {m.isPositive ? (
                  <span className="text-emerald-400 flex items-center"><ArrowUpRight className="w-3 h-3" /> {m.change}</span>
                ) : (
                  <span className="text-amber-400 flex items-center"><ArrowDownRight className="w-3 h-3" /> {m.change}</span>
                )}
                <span className="text-slate-500">vs periodo anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección Central de Paneles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla Resumen de Operaciones */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-mono font-bold text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              ÚLTIMAS MOVIEMIENTOS DE INVENTARIO
            </h2>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              EN VIVO
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Almacén</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2 text-right">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <tr className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-2.5 text-emerald-400 font-bold">SKU-9041</td>
                  <td className="py-2.5 text-slate-300">Válvula Industrial 1/2"</td>
                  <td className="py-2.5 text-slate-400">ALM-CENTRAL</td>
                  <td className="py-2.5 text-emerald-400">ENTRADA</td>
                  <td className="py-2.5 text-right font-bold text-slate-200">+150</td>
                </tr>
                <tr className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-2.5 text-emerald-400 font-bold">SKU-8820</td>
                  <td className="py-2.5 text-slate-300">Conector Trifásico A-2</td>
                  <td className="py-2.5 text-slate-400">ALM-NORTE</td>
                  <td className="py-2.5 text-amber-400">SALIDA</td>
                  <td className="py-2.5 text-right font-bold text-slate-200">-25</td>
                </tr>
                <tr className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-2.5 text-emerald-400 font-bold">SKU-1049</td>
                  <td className="py-2.5 text-slate-300">Sensor de Presión 24V</td>
                  <td className="py-2.5 text-slate-400">ALM-CENTRAL</td>
                  <td className="py-2.5 text-emerald-400">ENTRADA</td>
                  <td className="py-2.5 text-right font-bold text-slate-200">+40</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Console / System Log Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-mono font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              LOG DE EVENTOS API
            </h2>
            <span className="text-[10px] font-mono text-slate-500">AUDIT TRAIL</span>
          </div>

          <div className="space-y-3 font-mono text-[11px]">
            {recentLogs.map((log, i) => (
              <div key={i} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span>[{log.time}]</span>
                  <span className={
                    log.type === 'SUCCESS' ? 'text-emerald-400' :
                    log.type === 'WARN' ? 'text-amber-400' : 'text-blue-400'
                  }>
                    {log.type}
                  </span>
                </div>
                <p className="text-slate-300 leading-tight">{log.event}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;