import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  UserCheck, 
  Target, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  Truck, 
  Package, 
  Building, 
  LogOut,
  Terminal
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const mainNavigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Usuarios', path: '/usuarios', icon: Users },
    { name: 'Roles y Permisos', path: '/roles', icon: Shield },
    { name: 'Clientes (CRM)', path: '/clientes', icon: UserCheck },
    { name: 'Oportunidades', path: '/oportunidades', icon: Target },
    { name: 'Cotizaciones', path: '/cotizaciones', icon: FileText },
    { name: 'Pedidos de Venta', path: '/pedidos', icon: ShoppingCart },
    { name: 'Facturación (CFDI)', path: '/facturas', icon: Receipt },
    { name: 'Compras y Proveedores', path: '/compras', icon: Truck },
    { name: 'Inventario / Almacenes', path: '/inventario', icon: Package },
  ];

  const adminNavigation = [
    { name: 'Consola Admin', path: '/admin/dashboard', icon: Terminal },
    { name: 'Gestión Tenants', path: '/admin/tenants', icon: Building },
  ];

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none">
      <div>
        {/* Header del Sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
            NV
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-wider text-slate-100 text-sm">NOVA ERP</h1>
            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">v2.4.0 // ONLINE</p>
          </div>
        </div>

        {/* Links de Módulos */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            Módulos del Sistema
          </div>
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold border-t border-slate-800/60 mt-3">
                Administración Global
              </div>
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                          : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900 border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Footer Usuario / Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-mono font-medium text-slate-200 truncate">{user?.nombre || user?.email || 'Usuario'}</p>
            <p className="text-[10px] font-mono text-slate-500 uppercase truncate">{user?.role || 'Operador'}</p>
          </div>
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;