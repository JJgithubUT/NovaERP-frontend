import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bell, Activity, Database, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

const MainLayout = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior Terminal */}
        <header className="h-14 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 backdrop-blur z-10">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">TENANT:</span>
              <span className="text-emerald-400 font-bold uppercase">{user?.tenant_name || 'DEMO-CORP'}</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-slate-500">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>DB: Isolated-PGSQL</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden lg:flex items-center gap-2 text-slate-400 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTime || '00:00:00'} UTC-6</span>
            </div>

            <button 
              className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded relative hover:border-slate-700 transition-colors"
              title="Notificaciones del sistema"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Zona de Contenido Principal */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;