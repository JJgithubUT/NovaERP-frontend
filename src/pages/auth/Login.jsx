import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Lock, Mail, Building2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginPhase1 } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await loginPhase1(tenantSlug, email, password);
      // mfa:"enroll" -> primer login, hay que mostrar el QR antes del código.
      // mfa:"otp"    -> ya enrolado, la pantalla de OTP solo pide el código.
      navigate('/auth/otp', {
        state: {
          mfa: result.mfa,
          secret: result.secret,
          otpauthUri: result.otpauth_uri,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Credenciales inválidas o error de conexión'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-mono font-bold tracking-wider text-emerald-400">NOVA ERP</h1>
          <p className="text-sm text-slate-400 mt-1">Acceso al Sistema Integrado</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-400 text-sm rounded font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Empresa (Tenant)</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                required
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.trim().toLowerCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="acme"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="usuario@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <Link to="/auth/recuperar-password" className="text-slate-400 hover:text-emerald-400 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-slate-950 font-mono font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors uppercase text-sm"
          >
            {isSubmitting ? 'Verificando...' : 'Continuar'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;