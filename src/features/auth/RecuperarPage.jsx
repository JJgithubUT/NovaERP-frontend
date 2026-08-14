import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { solicitarRestablecimiento } from '../../api/services/core.api';
import { mensajeDeError } from '../../core/errors/mensaje-error';
import { AvisoError, PantallaAcceso } from './PantallaAcceso';
/**
 * Solicitud de restablecimiento de contraseña (RF-18, primera mitad).
 *
 * Es la única vía de vuelta para quien olvidó su contraseña: un administrador
 * **no** puede fijarla —el backend rechaza cualquier credencial en el PATCH de
 * usuario— y los enlaces de activación solo sirven para cuentas que todavía no
 * se han activado.
 *
 * ## Lo que esta pantalla no dice
 *
 * El backend responde **siempre el mismo mensaje**, exista el correo o no
 * (RN02): la respuesta no puede servir para averiguar quién tiene cuenta. Por
 * eso aquí se muestra su mensaje literal en vez de redactar un «te hemos
 * enviado un correo», que afirmaría algo que el servidor no ha confirmado. Y
 * por eso el botón no se deshabilita tras enviar: reintentarlo tampoco revela
 * nada.
 *
 * ## Por qué pide la organización
 *
 * El backend busca al usuario por la pareja organización + correo, así que sin
 * el identificador no hay a quién buscar. Se arrastra desde el login por la
 * query string cuando se llega desde ahí, que es el camino normal.
 */
export function RecuperarPage() {
  const [searchParams] = useSearchParams();
  const [tenantSlug, setTenantSlug] = useState(searchParams.get('tenant')?.trim() ?? '');
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  /** Mensaje del servidor una vez enviada la solicitud. `null` = sin enviar. */
  const [enviado, setEnviado] = useState(null);
  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const { mensaje } = await solicitarRestablecimiento({
        tenant_slug: tenantSlug.trim(),
        correo: correo.trim(),
      });
      setEnviado(mensaje);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo enviar la solicitud.'));
    } finally {
      setEnviando(false);
    }
  }
  const volver = (
    <Link to="/login" className="font-semibold text-action hover:underline">
      Volver al inicio de sesión
    </Link>
  );
  if (enviado !== null) {
    return (
      <PantallaAcceso titulo="Revisa tu correo" subtitulo="Solicitud enviada" pie={volver}>
        {/* Mensaje del servidor, palabra por palabra: es deliberadamente
                ambiguo y redactarlo de nuevo afirmaría de más. */}
        <p className="rounded-DEFAULT border border-outline bg-background p-4 text-body-md leading-relaxed text-on-surface">
          {enviado}
        </p>
        <p className="mt-4 text-body-sm text-on-surface-variant">
          El enlace vive una hora. Si no llega, revisa la carpeta de spam o vuelve a solicitarlo.
        </p>
      </PantallaAcceso>
    );
  }
  return (
    <PantallaAcceso
      titulo="Restablecer contraseña"
      subtitulo="Te enviaremos un enlace para crear una nueva"
      pie={volver}
    >
      {error ? <AvisoError mensaje={error} /> : null}

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="campo">
          <label className="campo-etiqueta" htmlFor="tenant_slug">
            Organización
          </label>
          <input
            id="tenant_slug"
            type="text"
            autoComplete="organization"
            placeholder="ej. acme"
            required
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            /* Recorta al salir del campo: un valor pegado del portapapeles
       suele arrastrar un espacio, y el backend no lo perdona. */
            onBlur={() => setTenantSlug((v) => v.trim())}
            className="campo-control font-mono"
          />
          <p className="text-body-sm text-on-surface-variant">
            El mismo identificador con el que inicias sesión.
          </p>
        </div>

        <div className="campo">
          <label className="campo-etiqueta" htmlFor="correo">
            Correo Electrónico
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="username"
            placeholder="usuario@dominio.com"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            onBlur={() => setCorreo((v) => v.trim())}
            className="campo-control"
          />
        </div>

        <button type="submit" disabled={enviando} className="btn btn-primario py-3.5">
          {enviando ? 'Enviando...' : 'Enviarme el enlace'}
        </button>
      </form>
    </PantallaAcceso>
  );
}
