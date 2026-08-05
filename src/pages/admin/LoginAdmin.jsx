import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { ShieldAlert, Lock, Mail } from 'lucide-react';

const LoginAdmin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginAdmin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Acceso denegado o credenciales de administrador inválidas'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 border-t-4 border-amber-500">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h1 className="text-xl font-mono font-bold tracking-wider text-amber-500">PANEL SUPERADMIN</h1>
          <p className="text-xs text-slate-400 mt-1">Gestión Global de Tenants y Permisos</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-400 text-sm rounded font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Correo Administrador</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-10 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none font-mono"
                placeholder="admin@system.local"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Contraseña Master</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-10 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-slate-950 font-mono font-bold py-2.5 px-4 rounded transition-colors uppercase text-sm"
          >
            {isSubmitting ? 'Autenticando...' : 'Ingresar al Consola Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginAdmin;