import { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Truck
} from 'lucide-react';
import Ventas from './pages/Ventas';
import Inventario from './pages/Inventario';
import Compras from './pages/Compras';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // Iniciamos en dashboard por defecto tras login

  // Estado para guardar los datos reales del usuario actual
  const [userData, setUserData] = useState({
    nombre: 'Usuario',
    correo: 'admin@acme.com',
    iniciales: 'US'
  });

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('user_info'));
      if (storedUser) {
        setUserData({
          nombre: storedUser.nombre || 'Administrador',
          correo: storedUser.correo || 'admin@acme.com',
          iniciales: (storedUser.nombre ? storedUser.nombre.substring(0, 2).toUpperCase() : 'AD')
        });
      }
    }
  }, []);

  const handleLoginSuccess = (infoUsuario) => {
    setIsAuthenticated(true);
    if (infoUsuario) {
      setUserData({
        nombre: infoUsuario.nombre || 'Administrador',
        correo: infoUsuario.correo || 'admin@acme.com',
        iniciales: (infoUsuario.nombre ? infoUsuario.nombre.substring(0, 2).toUpperCase() : 'AD')
      });
      localStorage.setItem('user_info', JSON.stringify(infoUsuario));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'compras', label: 'Compras', icon: Truck },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
  ];

  return (
    <div className="h-screen bg-[var(--color-fondo-main,#F2F2F2)] text-slate-800 flex flex-col md:flex-row overflow-hidden">
      
      {/* Navbar Superior para Pantallas Móviles (Fijo arriba) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[var(--color-gris-medio)]/40 shadow-sm shrink-0 z-30">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-guinda-base,#73030D)]">novaERP</h1>
          <p className="text-[10px] text-slate-500 font-medium">Sistema de Gestión</p>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-600 hover:text-[var(--color-guinda-base,#73030D)]"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar de Navegación (Fijo y estático en desktop, con altura de pantalla completa) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-[var(--color-gris-medio)]/40 p-3 
        transition-all duration-300 ease-in-out shadow-sm flex flex-col justify-between h-full overflow-visible shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        w-64
      `}>
        {/* Botón flotante para Ocultar/Mostrar */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-7 bg-[var(--color-guinda-base,#73030D)] text-white p-1 rounded-full shadow-md hover:bg-[var(--color-guinda-base,#73030D)]/90 transition-transform active:scale-95 z-50"
          title={isCollapsed ? "Expandir menú" : "Plegar menú"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Sección Superior (Logo y Navegación) */}
        <div className="space-y-4">
          <div className="hidden md:flex items-center gap-3 px-1 h-10">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-guinda-base,#73030D)] text-white flex items-center justify-center font-bold text-base shrink-0">
              N
            </div>
            {(!isCollapsed || sidebarOpen) && (
              <div className="whitespace-nowrap">
                <h1 className="text-xl font-extrabold text-[var(--color-guinda-base,#73030D)] tracking-tight leading-none">
                  novaERP
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Sistema de Gestión</p>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  title={isCollapsed ? item.label : ''}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group
                    ${isActive 
                      ? 'bg-[var(--color-guinda-base,#73030D)] text-white shadow-md shadow-[var(--color-guinda-base,#73030D)]/20' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    ${isCollapsed ? 'justify-center md:px-0' : ''}
                  `}
                >
                  <Icon size={20} className="shrink-0" />
                  {(!isCollapsed || sidebarOpen) && (
                    <span className="whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sección Inferior fija (Usuario y Cerrar Sesión compactos sin scroll) */}
        <div className="border-t border-slate-100 pt-3 pb-1 px-1 space-y-2 mt-auto">
          <div className={`flex items-center gap-2.5 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-100 ${isCollapsed ? 'justify-center p-2' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-[var(--color-guinda-base,#73030D)]/10 text-[var(--color-guinda-base,#73030D)] font-bold flex items-center justify-center text-xs shrink-0">
              {userData.iniciales}
            </div>
            {(!isCollapsed || sidebarOpen) && (
              <div className="truncate whitespace-nowrap overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate">{userData.nombre}</p>
                <p className="text-[10px] text-slate-400 truncate">{userData.correo}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isCollapsed ? "Cerrar Sesión" : ''}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 
              hover:bg-rose-50 transition-colors
              ${isCollapsed ? 'justify-center px-0' : ''}
            `}
          >
            <LogOut size={16} className="shrink-0" />
            {(!isCollapsed || sidebarOpen) && (
              <span className="whitespace-nowrap">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido (Con scroll independiente) */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'ventas' && <Ventas />}
        {activeTab === 'inventario' && <Inventario />}
        {activeTab === 'compras' && <Compras />}
        
        {activeTab !== 'dashboard' && activeTab !== 'ventas' && activeTab !== 'inventario' && activeTab !== 'compras' && (
          <div className="space-y-6">
            <header className="mb-4">
              <h1 className="text-2xl font-bold capitalize text-[var(--color-negro-profundo,#0D0D0D)]">
                {menuItems.find(m => m.id === activeTab)?.label || activeTab}
              </h1>
              <p className="text-sm text-slate-500">
                Módulo de gestión para novaERP
              </p>
            </header>

            <section className="bg-white border border-[var(--color-gris-medio)]/30 rounded-2xl p-8 min-h-[350px] shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Package size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 capitalize">
                Módulo de {activeTab}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mt-1">
                Este módulo se encuentra listo para conectar sus endpoints de Django.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}