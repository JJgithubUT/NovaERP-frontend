import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';

const Otp = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { verifyOtp, reto } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const inputsRef = useRef([]);

  // mfa/secret/otpauth_uri llegan desde Login.jsx vía router state.
  // Solo existen en el PRIMER login (mfa:"enroll"): hay que enrolar el
  // segundo factor antes de poder confirmar el código.
  const { mfa, secret, otpauthUri } = location.state || {};
  const isEnrolling = mfa === 'enroll';

  // Sin "reto" no hubo fase 1 válida en esta sesión de navegador:
  // no tiene sentido estar aquí, de vuelta al login.
  useEffect(() => {
    if (!reto) {
      navigate('/auth/login', { replace: true });
    }
  }, [reto, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Por favor ingresa el código completo de 6 dígitos');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await verifyOtp(fullCode);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Código 2FA inválido o expirado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
        <div className="mb-6 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          <h1 className="text-xl font-mono font-bold tracking-wider">Verificación de Seguridad</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isEnrolling
              ? 'Primer inicio de sesión: configura tu app autenticadora'
              : 'Ingresa el código TOTP de 6 dígitos'}
          </p>
        </div>

        {isEnrolling && (secret || otpauthUri) && (
          <div className="mb-5 p-3 bg-slate-950 border border-emerald-500/30 rounded font-mono text-xs space-y-2">
            <p className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[10px]">
              <KeyRound className="w-3.5 h-3.5" /> Enrolamiento MFA (una sola vez)
            </p>
            <p className="text-slate-400">
              Agrega esta cuenta en tu app autenticadora (Google Authenticator, Authy, etc.)
              usando la URI de configuración, o ingresa el secreto manualmente:
            </p>
            {secret && (
              <p className="break-all text-slate-200 bg-slate-900 border border-slate-800 rounded p-2">
                {secret}
              </p>
            )}
            {otpauthUri && (
              <p className="break-all text-slate-500">{otpauthUri}</p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-400 text-sm rounded font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-mono font-bold bg-slate-950 border border-slate-700 rounded focus:border-emerald-500 focus:outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-slate-950 font-mono font-bold py-2.5 px-4 rounded transition-colors uppercase text-sm"
          >
            {isSubmitting ? 'Validando...' : 'Confirmar e Ingresar'}
          </button>
        </form>

        <button
          onClick={() => navigate('/auth/login')}
          className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 font-mono"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};

export default Otp;