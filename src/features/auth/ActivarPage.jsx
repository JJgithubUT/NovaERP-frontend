import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { activarCuenta } from '../../api/services/core.api';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { AvisoError, PantallaAcceso } from './PantallaAcceso';

/**
 * Canje del enlace de alta de una cuenta de usuario (RF-05).
 *
 * Es **pública y sin guard de invitado**, igual que `/restablecer` y
 * `/activar-organizacion`: quien la abre todavía no puede autenticarse, pero
 * puede estar en un navegador con la sesión de otra persona. Mandarlo a «su»
 * tenant le impediría canjear el código.
 *
 * El mismo token sirve a dos flujos, y **cuál aplica lo decide el estado del
 * registro, no el cliente** (`POST /api/auth/activar/`):
 *
 *   · Alta de cuenta: el usuario no tiene contraseña y el token es el único
 *     camino para fijarla. Es el caso que la pantalla presenta por defecto.
 *   · Reconfirmación de correo (RF-07): el usuario ya tiene contraseña y solo
 *     confirma su dirección nueva. Ahí el backend **rechaza** que se mande una
 *     contraseña, para que un enlace de confirmación no acabe funcionando como
 *     un restablecimiento de credenciales.
 *
 * Como no hay forma de saber de antemano en cuál de los dos está el usuario, se
 * ofrece el segundo como una salida explícita en vez de adivinar con una
 * llamada de sondeo: ese sondeo consumiría el token de un solo uso sin que
 * nadie lo haya pedido.
 */
export function ActivarPage() {
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
  /** Distingue los dos desenlaces posibles para no felicitar por lo que no fue. */
  const [soloCorreo, setSoloCorreo] = useState(false);

  const coinciden = password === confirmacion;

  /** `conPassword` en false es la reconfirmación de correo: el body va sin ella. */
  async function activar(conPassword) {
    if (enviando) return;

    setEnviando(true);
    setError(null);
    setErrorCampo(null);

    try {
      setActivado(await activarCuenta(conPassword ? { token, password } : { token }));
      setSoloCorreo(!conPassword);
    } catch (e) {
      // El 422 señala el campo exacto: `password` si no cumple la política del
      // tenant o si esta cuenta ya tenía una, `token` si el enlace expiró.
      setErrorCampo(campoDeError(e));
      setError(mensajeDeError(e, 'No se pudo activar la cuenta.'));
    } finally {
      setEnviando(false);
    }
  }

  function enviar(evento) {
    evento.preventDefault();
    if (!coinciden) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    void activar(true);
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
      <PantallaAcceso titulo="Enlace incompleto" subtitulo="Falta el código de activación" pie={volver}>
        <p className="text-body-md leading-relaxed text-on-surface">
          Abre el enlace tal como llegó en el correo. Si tu gestor de correo lo partió en dos
          líneas, cópialo entero en la barra de direcciones.
        </p>
        <p className="mt-4 text-body-sm text-on-surface-variant">
          El correo también trae el código suelto, por si el enlace no funciona: puedes pegarlo al
          final de esta dirección, después de <code>?token=</code>.
        </p>
      </PantallaAcceso>
    );
  }

  if (activado) {
    return (
      <PantallaAcceso
        titulo={soloCorreo ? 'Correo confirmado' : 'Cuenta activada'}
        subtitulo={activado.correo ?? 'Ya puedes entrar'}
        pie={volver}
      >
        <p className="rounded-DEFAULT border border-outline bg-background p-4 text-body-md leading-relaxed text-on-surface">
          {soloCorreo
            ? 'Tu dirección quedó confirmada. Tu contraseña no cambió: entra con la de siempre.'
            : 'Tu contraseña quedó fijada. En tu primer inicio de sesión tendrás que configurar el segundo factor con una aplicación de autenticación.'}
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
      titulo="Activa tu cuenta"
      subtitulo="Elige la contraseña con la que vas a entrar"
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
          Este código es de un solo uso y caduca a las 24 horas de emitirse. Si ya venció, quien
          administra tu organización puede emitir uno nuevo.
        </p>

        <button type="submit" disabled={enviando || !coinciden} className="btn btn-primario py-3.5">
          {enviando ? 'Activando...' : 'Activar cuenta'}
        </button>
      </form>

      {/*
       * Salida del segundo flujo: el correo de «confirme su nueva dirección»
       * llega a esta misma ruta, pero ahí la cuenta ya tiene contraseña y el
       * backend rechaza que se mande una.
       */}
      <div className="mt-6 border-t border-outline-variant pt-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Solo estás confirmando una dirección de correo nueva? Entonces tu cuenta ya tiene
          contraseña y no hay que tocarla.
        </p>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void activar(false)}
          className="btn btn-secundario mt-3 w-full py-3"
        >
          {enviando ? 'Confirmando...' : 'Confirmar mi correo sin cambiar la contraseña'}
        </button>
      </div>
    </PantallaAcceso>
  );
}
