import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as coreApi from '../../../api/services/core.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { toasts } from '../../../shared/ui/toast';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

/** Los campos numéricos de la política, con su explicación. */
const CAMPOS = [
  {
    clave: 'politica_password_min_len',
    etiqueta: 'Longitud mínima de contraseña',
    ayuda: 'Se aplica al fijar o restablecer la contraseña, no a las ya existentes.',
  },
  {
    clave: 'jwt_expiracion_horas',
    etiqueta: 'Duración de la sesión (horas)',
    ayuda: 'No hay refresh token: al expirar, el usuario vuelve a autenticarse.',
  },
  {
    clave: 'intentos_max_ventana',
    etiqueta: 'Intentos fallidos permitidos',
    ayuda: 'Cuenta fallos de contraseña y de OTP juntos.',
  },
  {
    clave: 'ventana_minutos',
    etiqueta: 'Ventana de conteo (minutos)',
    ayuda: 'Periodo en el que se acumulan esos intentos.',
  },
  {
    clave: 'bloqueo_minutos',
    etiqueta: 'Duración del bloqueo (minutos)',
    ayuda: 'Cuánto tiempo queda bloqueada la cuenta al agotar los intentos.',
  },
];

/**
 * Política de seguridad del tenant.
 *
 * Cada campo tiene un rango que impone la **plataforma**, no el tenant: llega en
 * `limites_plataforma` y el formulario lo respeta con `min`/`max` y lo dice en
 * el texto de ayuda. Sin eso, el admin descubriría el tope solo al recibir un
 * 422 sin saber cuál era el número aceptable.
 *
 * `updated_at` en `null` significa que el tenant nunca guardó su política y
 * está corriendo con los valores por defecto — vale la pena decirlo, porque no
 * es lo mismo que haberlos elegido.
 */
export function SeguridadPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [valores, setValores] = useState(/** @type {Record<string, string>} */ ({}));
  const [regex, setRegex] = useState('');

  const consulta = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'config-seguridad'),
    enabled: tenantSlug !== '',
    queryFn: () => coreApi.configSeguridad(),
  });

  const config = consulta.data;

  /* Siembra el formulario cuando llega la configuración del servidor. */
  useEffect(() => {
    if (!config) return;
    setValores(Object.fromEntries(CAMPOS.map((c) => [c.clave, String(config[c.clave])])));
    setRegex(config.politica_password_regex ?? '');
  }, [config]);

  const guardado = useMutation({
    mutationFn: (datos) => coreApi.editarConfigSeguridad(datos),
    onSuccess: () => {
      toasts.exito('Política de seguridad actualizada.');
      void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'config-seguridad') });
    },
  });

  const limites = config?.limites_plataforma ?? {};

  /** @param {string} clave */
  function errorDe(clave) {
    const valor = Number(valores[clave]);
    const limite = limites[clave];

    if (valores[clave] !== undefined && !Number.isInteger(valor))
      return 'Debe ser un número entero.';
    if (limite && Number.isInteger(valor) && (valor < limite.min || valor > limite.max)) {
      return `La plataforma permite entre ${limite.min} y ${limite.max}.`;
    }
    return campoDeError(guardado.error) === clave ? mensajeDeError(guardado.error) : '';
  }

  const hayErrores = CAMPOS.some((c) => errorDe(c.clave) !== '');
  const errorGeneral =
    !guardado.error || campoDeError(guardado.error) ? null : mensajeDeError(guardado.error);

  function enviar(evento) {
    evento.preventDefault();
    if (hayErrores || guardado.isPending) return;

    guardado.mutate({
      ...Object.fromEntries(CAMPOS.map((c) => [c.clave, Number(valores[c.clave])])),
      // `null` y no `''`: vacío significa "sin patrón exigido".
      politica_password_regex: regex.trim() || null,
    });
  }

  /*
   * El encabezado se pinta siempre, también mientras carga o falla: si la
   * pantalla entera se sustituye por un aviso, el usuario pierde el título y
   * solo le queda la pestaña para saber dónde está.
   */
  const aviso =
    consulta.fetchStatus === 'paused'
      ? 'Sin conexión con el servidor.'
      : consulta.isPending
        ? 'Cargando política…'
        : consulta.error
          ? mensajeDeError(consulta.error, 'No se pudo cargar la política de seguridad.')
          : null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h2 className="text-headline-sm text-on-surface">Seguridad</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Política de contraseñas, duración de sesión y bloqueo por intentos fallidos.
        </p>
      </div>

      {aviso ? (
        <p
          className={
            consulta.isPending ? 'text-body-sm text-on-surface-variant' : 'text-body-sm text-error'
          }
        >
          {aviso}
        </p>
      ) : null}

      {!config ? null : config.updated_at === null ? (
        <p className="rounded-DEFAULT border border-outline bg-background px-3 py-2 text-body-sm text-on-surface-variant">
          Nunca se ha guardado una política propia: estos son los valores por defecto de la
          plataforma.
        </p>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Última modificación: {formatFechaHora(config.updated_at)}
        </p>
      )}

      {errorGeneral ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {errorGeneral}
        </p>
      ) : null}

      {!config ? null : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {CAMPOS.map((campo) => {
              const limite = limites[campo.clave];
              return (
                <Campo
                  key={campo.clave}
                  etiqueta={campo.etiqueta}
                  paraId={campo.clave}
                  error={errorDe(campo.clave)}
                  ayuda={
                    limite ? `${campo.ayuda} Permitido: ${limite.min}–${limite.max}.` : campo.ayuda
                  }
                >
                  <input
                    id={campo.clave}
                    type="number"
                    inputMode="numeric"
                    min={limite?.min}
                    max={limite?.max}
                    className="campo-control"
                    value={valores[campo.clave] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [campo.clave]: e.target.value }))}
                  />
                </Campo>
              );
            })}
          </div>

          <Campo
            etiqueta="Patrón exigido a la contraseña"
            paraId="regex"
            error={
              campoDeError(guardado.error) === 'politica_password_regex'
                ? mensajeDeError(guardado.error)
                : ''
            }
            ayuda="Expresión regular. Déjalo vacío para no exigir ningún patrón más allá de la longitud."
          >
            <input
              id="regex"
              className="campo-control font-mono"
              placeholder="Sin patrón"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
            />
          </Campo>

          <button
            type="submit"
            className="btn btn-primario self-start"
            disabled={guardado.isPending || hayErrores}
          >
            {guardado.isPending ? 'Guardando…' : 'Guardar política'}
          </button>
        </form>
      )}
    </div>
  );
}
