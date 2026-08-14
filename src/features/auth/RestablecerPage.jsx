import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { restablecerPassword } from '../../api/services/core.api';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { AvisoError, PantallaAcceso } from './PantallaAcceso';
/**
 * Fija la contraseña nueva con el token del enlace (RF-18, segunda mitad).
 *
 * El token es de un solo uso y vive una hora. Al canjearlo, el backend
 * **invalida todas las sesiones previas** del usuario (RN03): quien tuviera la
 * cuenta abierta en otro dispositivo queda fuera. La pantalla lo advierte antes
 * de enviar, porque es una consecuencia que sorprende si no se anuncia.
 */
export function RestablecerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);
  const [listo, setListo] = useState(null);
  const coinciden = password === confirmacion;
  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    if (!coinciden) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    setError(null);
    setErrorCampo(null);
    try {
      const { mensaje } = await restablecerPassword({ token, password });
      setListo(mensaje);
    } catch (e) {
      // El 422 señala el campo exacto (`password` si no cumple la política).
      setErrorCampo(campoDeError(e));
      setError(mensajeDeError(e, 'No se pudo restablecer la contraseña.'));
    } finally {
      setEnviando(false);
    }
  }
  const volver = (
    <Link to="/login" className="font-semibold text-action hover:underline">
      Volver al inicio de sesión
    </Link>
  );
  /*
   * Sin token no hay nada que canjear: es lo que pasa al abrir la ruta a mano o
   * si el gestor de correo parte el enlace. Se dice, en vez de enseñar un
   * formulario que fallaría al enviarse.
   */
  if (!token) {
    return (
      <PantallaAcceso
        titulo="Enlace incompleto"
        subtitulo="Falta el código de restablecimiento"
        pie={volver}
      >
        <p className="text-body-md leading-relaxed text-on-surface">
          Abre el enlace tal como llegó en el correo. Si tu gestor de correo lo partió en dos
          líneas, cópialo entero en la barra de direcciones.
        </p>
        <Link to="/recuperar" className="btn btn-secundario mt-5 w-full py-3">
          Solicitar un enlace nuevo
        </Link>
      </PantallaAcceso>
    );
  }
  if (listo !== null) {
    return (
      <PantallaAcceso titulo="Contraseña actualizada" subtitulo="Ya puedes entrar" pie={volver}>
        <p className="rounded-DEFAULT border border-outline bg-background p-4 text-body-md leading-relaxed text-on-surface">
          {listo}
        </p>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="btn btn-primario mt-5 w-full py-3.5"
        >
          Iniciar sesión
        </button>
      </PantallaAcceso>
    );
  }
  return (
    <PantallaAcceso titulo="Nueva contraseña" subtitulo="Elige una que no hayas usado antes">
      {error ? <AvisoError mensaje={error} /> : null}

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="campo">
          <label className="campo-etiqueta" htmlFor="password">
            Contraseña
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errorCampo === 'password'}
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

        <div className="campo">
          <label className="campo-etiqueta" htmlFor="confirmacion">
            Repite la contraseña
          </label>
          <input
            id="confirmacion"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            aria-invalid={confirmacion !== '' && !coinciden}
            className="campo-control"
          />
          {confirmacion !== '' && !coinciden ? (
            <p className="campo-error">Las dos contraseñas no coinciden.</p>
          ) : null}
        </div>

        <p className="rounded-DEFAULT border border-outline bg-background px-3.5 py-3 text-body-sm text-on-surface-variant">
          Al cambiarla se cerrarán todas tus sesiones abiertas, incluida la de cualquier otro
          dispositivo.
        </p>

        <button type="submit" disabled={enviando || !coinciden} className="btn btn-primario py-3.5">
          {enviando ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </PantallaAcceso>
  );
}
