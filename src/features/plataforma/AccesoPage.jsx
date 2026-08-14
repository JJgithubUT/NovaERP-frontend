import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { login } from '../../core/plataforma/plataforma.service';
import { RUTA_ORGANIZACIONES } from '../../core/plataforma/rutas';
import { isApiError } from '../../core/errors/api-error.model';
import { AvisoError, PantallaAcceso } from '../auth/PantallaAcceso';

/**
 * Acceso al portal de plataforma (SysAdmin).
 *
 * A diferencia del login de tenant, es de **una sola fase**: el backend no
 * exige segundo factor al SysAdmin (decisión documentada,
 * `core.sysadmin.mfa_secret` queda reservada), así que no hay reto OTP después.
 *
 * Tampoco pide organización, y esa es la señal de que se está en la otra
 * superficie: esta cuenta no vive en `core.usuario` y su token no sirve en
 * `/api/auth/*`.
 */
export function AccesoPage() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    try {
      await login({ correo: correo.trim(), password });
      navigate(RUTA_ORGANIZACIONES, { replace: true });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PantallaAcceso
      titulo="Portal de plataforma"
      subtitulo="Administración de organizaciones"
      pie={
        <span className="text-on-surface-variant">
          ¿Buscas tu organización?{' '}
          <Link to="/login" className="font-semibold text-action hover:underline">
            Ir al acceso normal
          </Link>
        </span>
      }
    >
      <div className="mb-5 flex items-start gap-2 rounded-DEFAULT border border-outline bg-background px-3.5 py-3">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-action" />
        <p className="text-body-sm text-on-surface-variant">
          Esta cuenta administra <strong className="text-on-surface">todas</strong> las
          organizaciones. No es la de un usuario de empresa.
        </p>
      </div>

      {error ? <AvisoError mensaje={error} /> : null}

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="campo">
          <label className="campo-etiqueta" htmlFor="correo">
            Correo de administrador
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="username"
            placeholder="root@novaerp.local"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="campo-control"
          />
        </div>

        <div className="campo">
          <label className="campo-etiqueta" htmlFor="password">
            Contraseña
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="campo-control pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVerPassword(!verPassword)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3.5 flex items-center text-gris-medio"
            >
              {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={enviando} className="btn btn-primario py-3.5">
          {enviando ? 'Validando...' : 'Entrar al portal'}
        </button>
      </form>
    </PantallaAcceso>
  );
}
