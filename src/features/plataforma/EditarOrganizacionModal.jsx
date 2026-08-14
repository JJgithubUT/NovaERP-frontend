import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as plataformaApi from '../../api/services/plataforma.api';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { Campo } from '../../shared/ui/Campo';
import { Modal } from '../../shared/ui/Modal';

/**
 * Edición de los datos generales de una organización.
 *
 * El slug **no aparece**: es inmutable. Se muestra como dato para que se pueda
 * copiar, pero no hay campo que lo cambie.
 *
 * Cambiar de plan altera qué módulos se pueden contratar, no los ya activos: si
 * el plan nuevo no incluye alguno que esté encendido, el backend lo resuelve al
 * guardar. Por eso el aviso remite a revisar los módulos después.
 *
 * Un PATCH sin cambios se rechaza con 422, así que el botón se deshabilita
 * mientras no haya ninguno.
 *
 * @param {{
 *   organizacion: object,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function EditarOrganizacionModal({
  organizacion,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const [razonSocial, setRazonSocial] = useState(organizacion.razon_social);
  const [dominio, setDominio] = useState(organizacion.dominio_comercial);
  const [plan, setPlan] = useState(organizacion.plan?.codigo ?? '');

  const catalogos = useQuery({
    queryKey: ['plataforma', 'catalogos'],
    queryFn: () => plataformaApi.catalogos(),
  });

  const planes = (catalogos.data?.planes ?? []).filter(
    // Un plan retirado sigue listándose si es el que la organización tiene
    // contratado: ocultarlo dejaría el selector sin su valor actual.
    (p) => p.activo || p.codigo === organizacion.plan?.codigo,
  );

  const cambios = {};
  if (razonSocial.trim() !== organizacion.razon_social) cambios.razon_social = razonSocial.trim();
  if (dominio.trim() !== organizacion.dominio_comercial) cambios.dominio_comercial = dominio.trim();
  if (plan !== organizacion.plan?.codigo) cambios.plan = plan;

  const hayCambios = Object.keys(cambios).length > 0;
  const camposLlenos = razonSocial.trim() !== '' && dominio.trim() !== '' && plan !== '';
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar(evento) {
    evento?.preventDefault();
    if (!hayCambios || !camposLlenos || enviando) return;
    onGuardar(cambios);
  }

  return (
    <Modal
      titulo={`Editar ${organizacion.razon_social}`}
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
          <button
            type="button"
            className="btn btn-primario"
            disabled={enviando || !hayCambios || !camposLlenos}
            onClick={enviar}
          >
            {enviando ? 'Guardando…' : 'Guardar cambios'}
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

      <dl className="rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2">
        <dt className="text-label-caps uppercase text-on-surface-variant">Identificador</dt>
        <dd className="font-mono text-body-md text-on-surface">{organizacion.slug}</dd>
        <p className="mt-0.5 text-label-md text-on-surface-variant">
          No se puede cambiar: identifica a la organización en cada URL y en sus tokens.
        </p>
      </dl>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          etiqueta="Razón social"
          paraId="razon"
          error={campoDeError(error) === 'razon_social' ? mensajeDeError(error) : ''}
        >
          <input
            id="razon"
            className="campo-control"
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Dominio comercial"
          paraId="dominio"
          error={campoDeError(error) === 'dominio_comercial' ? mensajeDeError(error) : ''}
        >
          <input
            id="dominio"
            className="campo-control"
            value={dominio}
            onChange={(e) => setDominio(e.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Plan"
          paraId="plan"
          error={campoDeError(error) === 'plan' ? mensajeDeError(error) : ''}
          ayuda="Cambiar de plan cambia qué módulos se pueden contratar. Revísalos después."
        >
          <select
            id="plan"
            className="campo-control"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            {planes.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre} · {p.licencias_max} licencias
                {p.activo ? '' : ' (retirado)'}
              </option>
            ))}
          </select>
        </Campo>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
