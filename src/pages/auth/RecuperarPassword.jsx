import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Mail, Building2, ArrowLeft, CheckCircle } from 'lucide-react';

const RecuperarPassword = () => {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // La API siempre responde el mismo mensaje genérico, exista o no el
      // correo (no revela si una cuenta existe en el tenant).
      await api.post('/auth/recuperar/', { tenant_slug: tenantSlug, correo: email });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Ocurrió un error al procesar la solicitud'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
        <h1 className="text-xl font-mono font-bold tracking-wider text-center text-emerald-400 mb-2">
          Restablecer Contraseña
        </h1>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-sm text-slate-300">
              Si el correo existe en nuestro sistema, hemos enviado las instrucciones para restablecer tu contraseña.
            </p>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:underline pt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 text-red-400 text-sm rounded font-mono">
                {error}
              </div>
            )}

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
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Correo Registrado</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-slate-950 font-mono font-bold py-2.5 px-4 rounded transition-colors uppercase text-sm"
            >
              {loading ? 'Enviando...' : 'Enviar Instrucciones'}
            </button>

            <Link
              to="/auth/login"
              className="block text-center text-xs text-slate-500 hover:text-slate-300 font-mono pt-2"
            >
              Cancelar y volver
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;