import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { activarTenant } from '../../api/services/plataforma.api';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { AvisoError, PantallaAcceso } from './PantallaAcceso';

/**
 * Canje del enlace de alta de una organización.
 *
 * Es **pública y sin guard de invitado**, por la misma razón que `/activar`:
 * quien la usa todavía no tiene sesión, pero puede quedarle un token viejo de
 * otra persona en este navegador. Mandarlo a «su» tenant le impediría canjear
 * el código.
 *
 * Al terminar, la organización pasa de `pendiente` a `activa` y su
 * administrador inicial queda listo para entrar — pero **todavía tiene que
 * enrolar su segundo factor** en el primer login, así que se le dice adónde va
 * en lugar de dejarlo en un «listo» sin salida.
 */
export function ActivarTenantPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [errorCampo, setErrorCampo] = useState(/** @type {string | null} */ (null));
  const [activado, setActivado] = useState(/** @type {object | null} */ (null));

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
      setActivado(await activarTenant({ token, password }));
    } catch (e) {
      setErrorCampo(campoDeError(e));
      setError(mensajeDeError(e, 'No se pudo activar la organización.'));
    } finally {
      setEnviando(false);
    }
  }

  const volver = (
    <Link to="/login" className="font-semibold text-action hover:underline">
      Ir al inicio de sesión
    </Link>
  );

  /*
   * Sin token no hay nada que canjear: pasa al abrir la ruta a mano o si el
   * gestor de correo parte el enlace. Se dice, en vez de enseñar un formulario
   * que fallaría al enviarse.
   */
  if (!token) {
    return (
      <PantallaAcceso
        titulo="Enlace incompleto"
        subtitulo="Falta el código de activación"
        pie={volver}
      >
        <p className="text-body-md leading-relaxed text-on-surface">
          Abre el enlace tal como llegó en el correo. Si tu gestor de correo lo partió en dos
          líneas, cópialo entero en la barra de direcciones.
        </p>
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Si el código venció, quien administra la plataforma puede emitir uno nuevo.
        </p>
      </PantallaAcceso>
    );
  }

  if (activado) {
    return (
      <PantallaAcceso
        titulo="Organización activada"
        subtitulo={activado.tenant?.razon_social ?? 'Ya puedes entrar'}
        pie={volver}
      >
        <p className="rounded-DEFAULT border border-outline bg-background p-4 text-body-md leading-relaxed text-on-surface">
          Tu contraseña quedó fijada. En tu primer inicio de sesión tendrás que configurar el
          segundo factor con una aplicación de autenticación.
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
    <PantallaAcceso
      titulo="Activa tu organización"
      subtitulo="Elige la contraseña de tu cuenta de administrador"
      pie={volver}
    >
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
          Este código es de un solo uso. Al canjearlo, tu organización quedará activa y podrás dar
          de alta al resto de usuarios.
        </p>

        <button type="submit" disabled={enviando || !coinciden} className="btn btn-primario py-3.5">
          {enviando ? 'Activando...' : 'Activar organización'}
        </button>
      </form>
    </PantallaAcceso>
  );
}
