import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as plataformaApi from '../../api/services/plataforma.api';
import { isApiError } from '../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { Modal } from '../../shared/ui/Modal';
import { etiquetaFase } from './plataforma.labels';

/**
 * Activación y desactivación de módulos de una organización.
 *
 * Tres reglas del catálogo gobiernan qué se puede tocar, y las tres se explican
 * en la fila en vez de limitarse a deshabilitar la casilla:
 *
 * - **Núcleo** (`nucleo: true`) — nunca se desactiva. El backend responde 422.
 * - **Fuera del plan** — un módulo que el plan contratado no incluye no se
 *   puede activar. Se muestra igual, apagado y rotulado, por lo mismo que los
 *   permisos inertes: ocultarlo dejaría al SysAdmin preguntándose dónde está.
 * - **Dependencias** — apagar un módulo del que dependen otros activos exige
 *   confirmación. El backend contesta 422 con `requiere_confirmar_cascada` y la
 *   lista de afectados; entonces se muestran y se reintenta con
 *   `confirmar_cascada: true`.
 *
 * @param {{
 *   organizacion: object,
 *   activos: {codigo: string}[],
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function ModulosModal({
  organizacion,
  activos,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const catalogos = useQuery({
    queryKey: ['plataforma', 'catalogos'],
    queryFn: () => plataformaApi.catalogos(),
  });

  const iniciales = new Set(activos.map((m) => m.codigo));
  const [seleccion, setSeleccion] = useState(() => new Set(iniciales));

  const modulos = catalogos.data?.modulos ?? [];
  const planCodigo = organizacion.plan?.codigo;

  /** El backend ya pidió confirmar la cascada: se listan los afectados. */
  const afectados = (() => {
    if (!isApiError(error)) return null;
    if (error.extra['requiere_confirmar_cascada'] !== true) return null;
    const lista = error.extra['modulos_afectados'];
    return Array.isArray(lista) ? lista.map(String) : [];
  })();

  function alternar(codigo) {
    setSeleccion((actual) => {
      const copia = new Set(actual);
      if (copia.has(codigo)) copia.delete(codigo);
      else copia.add(codigo);
      return copia;
    });
  }

  const activar = [...seleccion].filter((c) => !iniciales.has(c));
  const desactivar = [...iniciales].filter((c) => !seleccion.has(c));
  const hayCambios = activar.length > 0 || desactivar.length > 0;

  const errorGeneral = !error || campoDeError(error) || afectados ? null : mensajeDeError(error);

  function enviar(confirmarCascada) {
    if (!hayCambios || enviando) return;
    onGuardar({
      modulos: { activar, desactivar },
      ...(confirmarCascada ? { confirmar_cascada: true } : {}),
    });
  }

  // Agrupa por fase solo para leerlo mejor; la fase no decide nada.
  const porFase = modulos.reduce((mapa, modulo) => {
    const lista = mapa.get(modulo.fase) ?? [];
    lista.push(modulo);
    mapa.set(modulo.fase, lista);
    return mapa;
  }, /** @type {Map<number, object[]>} */ (new Map()));

  return (
    <Modal
      titulo={`Módulos de ${organizacion.razon_social}`}
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
          <button
            type="button"
            className={afectados ? 'btn btn-peligro' : 'btn btn-primario'}
            disabled={enviando || !hayCambios}
            onClick={() => enviar(afectados !== null)}
          >
            {enviando ? 'Guardando…' : afectados ? 'Desactivar de todos modos' : 'Guardar cambios'}
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

      {afectados ? (
        <div className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
          <p className="font-semibold">Hay módulos activos que dependen de los que vas a apagar.</p>
          <p className="mt-1">
            {afectados.length > 0
              ? `Se desactivarán también: ${afectados.join(', ')}.`
              : 'Se desactivarán también los que dependan de ellos.'}
          </p>
        </div>
      ) : null}

      {catalogos.isPending ? (
        <p className="text-body-sm text-on-surface-variant">Cargando catálogo…</p>
      ) : (
        [...porFase.entries()]
          .sort(([a], [b]) => a - b)
          .map(([fase, lista]) => (
            <section key={fase}>
              <h3 className="mb-1 text-label-caps uppercase text-on-surface-variant">
                {etiquetaFase(fase)}
              </h3>

              <div className="flex flex-col gap-1 rounded-DEFAULT border border-outline-variant p-2">
                {lista.map((modulo) => {
                  const enPlan = modulo.planes.includes(planCodigo);
                  const bloqueado = modulo.nucleo || !enPlan;
                  const marcado = seleccion.has(modulo.codigo);

                  return (
                    <label
                      key={modulo.codigo}
                      className={`flex items-start gap-2 text-body-sm ${
                        bloqueado ? 'opacity-60' : 'text-on-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={marcado}
                        disabled={bloqueado}
                        onChange={() => alternar(modulo.codigo)}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{modulo.nombre}</span>
                        <span className="ml-2 font-mono text-label-md text-on-surface-variant">
                          {modulo.codigo}
                        </span>

                        {modulo.nucleo ? (
                          <span className="ml-2 text-label-md">· núcleo, no desactivable</span>
                        ) : !enPlan ? (
                          <span className="ml-2 text-label-md">· no incluido en el plan</span>
                        ) : modulo.depende_de.length > 0 ? (
                          <span className="ml-2 text-label-md text-on-surface-variant">
                            · requiere {modulo.depende_de.join(', ')}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))
      )}

      {hayCambios ? (
        <p className="text-body-sm text-on-surface-variant">
          {activar.length > 0 ? `Se activarán: ${activar.join(', ')}. ` : ''}
          {desactivar.length > 0 ? `Se desactivarán: ${desactivar.join(', ')}.` : ''}
        </p>
      ) : null}
    </Modal>
  );
}
