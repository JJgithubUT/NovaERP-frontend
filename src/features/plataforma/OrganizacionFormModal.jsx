import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as plataformaApi from '../../api/services/plataforma.api';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { Campo } from '../../shared/ui/Campo';
import { Modal } from '../../shared/ui/Modal';

const SLUG_VALIDO = /^[a-z0-9-]{3,50}$/;

/**
 * Alta de una organización.
 *
 * Crea el entorno **y** su administrador inicial en un solo paso: sin él, nadie
 * podría entrar nunca. La respuesta trae el token de activación, que se muestra
 * después en su propio modal.
 *
 * El **slug es inmutable**: identifica al tenant en cada URL de la aplicación
 * (`/acme/ventas`) y en el claim `tid` de todos sus tokens. Cambiarlo rompería
 * los enlaces guardados y las sesiones vivas, así que el backend no lo permite
 * — y el campo lo advierte antes de escribirlo, no después.
 *
 * Los `dominios_reservados` del catálogo se comprueban aquí: son segmentos de
 * primer nivel que la aplicación ya usa (`admin`, `login`…) y un tenant con ese
 * slug quedaría inalcanzable.
 *
 * @param {{
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function OrganizacionFormModal({ enviando = false, error = null, onGuardar, onCerrar }) {
  const [valores, setValores] = useState({
    slug: '',
    razon_social: '',
    dominio_comercial: '',
    plan: '',
    nombre_completo: '',
    correo: '',
  });
  const [tocado, setTocado] = useState(false);

  const catalogos = useQuery({
    queryKey: ['plataforma', 'catalogos'],
    queryFn: () => plataformaApi.catalogos(),
  });

  const planes = (catalogos.data?.planes ?? []).filter((p) => p.activo);
  const reservados = catalogos.data?.dominios_reservados ?? [];

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  const slug = valores.slug.trim().toLowerCase();
  const errores = {};

  if (!slug) errores.slug = 'Este campo es obligatorio.';
  else if (!SLUG_VALIDO.test(slug))
    errores.slug = 'Solo minúsculas, números y guiones, entre 3 y 50 caracteres.';
  else if (reservados.includes(slug))
    errores.slug = `«${slug}» está reservado por la plataforma y dejaría la organización inalcanzable.`;

  if (!valores.razon_social.trim()) errores.razon_social = 'Este campo es obligatorio.';
  if (!valores.dominio_comercial.trim()) errores.dominio_comercial = 'Este campo es obligatorio.';
  if (!valores.plan) errores.plan = 'Elige un plan.';
  if (!valores.nombre_completo.trim()) errores.nombre_completo = 'Este campo es obligatorio.';

  const correo = valores.correo.trim();
  if (!correo) errores.correo = 'Este campo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Correo no válido.';

  const hayErrores = Object.keys(errores).length > 0;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function errorDe(campo) {
    if (tocado && errores[campo]) return errores[campo];
    return campoDeError(error) === campo ? mensajeDeError(error) : '';
  }

  function enviar(evento) {
    evento?.preventDefault();
    if (hayErrores || enviando) {
      setTocado(true);
      return;
    }

    onGuardar({
      slug,
      razon_social: valores.razon_social.trim(),
      dominio_comercial: valores.dominio_comercial.trim(),
      plan: valores.plan,
      nombre_completo: valores.nombre_completo.trim(),
      correo,
    });
  }

  const planElegido = planes.find((p) => p.codigo === valores.plan);

  return (
    <Modal
      titulo="Nueva organización"
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
            {enviando ? 'Creando…' : 'Crear organización'}
          </button>
        </>
      }
    >
      {errorGeneral ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {errorGeneral}
        </p>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          etiqueta="Identificador (slug)"
          paraId="slug"
          error={errorDe('slug')}
          ayuda="No se puede cambiar después: identifica a la organización en cada URL y en sus tokens."
        >
          <input
            id="slug"
            className="campo-control font-mono"
            placeholder="acme"
            value={valores.slug}
            onChange={cambiar('slug')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Razón social" paraId="razon" error={errorDe('razon_social')}>
            <input
              id="razon"
              className="campo-control"
              value={valores.razon_social}
              onChange={cambiar('razon_social')}
              onBlur={() => setTocado(true)}
            />
          </Campo>

          <Campo etiqueta="Dominio comercial" paraId="dominio" error={errorDe('dominio_comercial')}>
            <input
              id="dominio"
              className="campo-control"
              placeholder="acme.com"
              value={valores.dominio_comercial}
              onChange={cambiar('dominio_comercial')}
              onBlur={() => setTocado(true)}
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Plan"
          paraId="plan"
          error={errorDe('plan')}
          ayuda={
            planElegido
              ? `${planElegido.licencias_max} licencias · módulos: ${planElegido.modulos.join(', ')}`
              : 'Determina las licencias y los módulos disponibles.'
          }
        >
          <select
            id="plan"
            className="campo-control"
            value={valores.plan}
            onChange={cambiar('plan')}
            onBlur={() => setTocado(true)}
          >
            <option value="">
              {catalogos.isPending ? 'Cargando planes…' : 'Selecciona un plan…'}
            </option>
            {planes.map((plan) => (
              <option key={plan.codigo} value={plan.codigo}>
                {plan.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <fieldset className="rounded-DEFAULT border border-outline-variant p-3">
          <legend className="px-1 text-label-caps uppercase text-on-surface-variant">
            Administrador inicial
          </legend>
          <p className="mb-3 text-body-sm text-on-surface-variant">
            Recibirá el enlace para fijar su contraseña. Sin él, nadie puede entrar a la
            organización.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre completo"
              paraId="admin-nombre"
              error={errorDe('nombre_completo')}
            >
              <input
                id="admin-nombre"
                className="campo-control"
                value={valores.nombre_completo}
                onChange={cambiar('nombre_completo')}
                onBlur={() => setTocado(true)}
              />
            </Campo>

            <Campo etiqueta="Correo" paraId="admin-correo" error={errorDe('correo')}>
              <input
                id="admin-correo"
                type="email"
                className="campo-control"
                value={valores.correo}
                onChange={cambiar('correo')}
                onBlur={() => setTocado(true)}
              />
            </Campo>
          </div>
        </fieldset>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
