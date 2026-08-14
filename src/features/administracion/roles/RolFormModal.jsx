import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import { SelectorPermisos } from './SelectorPermisos';

/**
 * Alta y edición de rol.
 *
 * Los permisos viajan como **códigos** `dominio:recurso:accion`, no como ids —
 * es lo que espera el backend.
 *
 * Un rol de sistema no se edita ni se desactiva (el backend responde 403). La
 * pantalla no ofrece el botón, y aquí el formulario queda en solo lectura para
 * que aun así se pueda inspeccionar qué autoriza.
 *
 * @param {{
 *   rol?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function RolFormModal({ rol = null, enviando = false, error = null, onGuardar, onCerrar }) {
  const esEdicion = rol !== null;
  const soloLectura = rol?.es_sistema === true;

  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  /*
   * El rol trae los permisos agrupados por dominio; el formulario los maneja
   * como una lista plana de códigos, que es como se mandan.
   */
  const [permisos, setPermisos] = useState(() =>
    rol ? rol.permisos.flatMap((grupo) => grupo.permisos.map((p) => p.codigo)) : [],
  );
  const [tocado, setTocado] = useState(false);

  const errorNombre = !nombre.trim() ? 'Este campo es obligatorio.' : '';
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar(evento) {
    evento?.preventDefault();
    if (errorNombre || enviando || soloLectura) {
      setTocado(true);
      return;
    }
    onGuardar({ nombre: nombre.trim(), permisos });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${rol.nombre}` : 'Nuevo rol'}
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
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </button>
          {soloLectura ? null : (
            <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </button>
          )}
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

      {soloLectura ? (
        <p className="rounded-DEFAULT border border-outline bg-background px-3 py-2 text-body-sm text-on-surface-variant">
          Es un rol de sistema: no se puede modificar ni desactivar. Se muestra para que puedas ver
          qué autoriza.
        </p>
      ) : null}

      {rol?.acceso_total ? (
        <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
          Este rol tiene <strong>acceso total</strong>: autoriza cualquier operación sin pasar por
          el catálogo de permisos.
        </p>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          etiqueta="Nombre del rol"
          paraId="nombre"
          error={
            tocado && errorNombre
              ? errorNombre
              : campoDeError(error) === 'nombre'
                ? mensajeDeError(error)
                : ''
          }
        >
          <input
            id="nombre"
            className="campo-control"
            disabled={soloLectura}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <div className="campo">
          <label className="campo-etiqueta">Permisos ({permisos.length})</label>
          <SelectorPermisos
            seleccion={permisos}
            onSeleccion={setPermisos}
            deshabilitado={soloLectura}
          />
          <p className="text-body-sm text-on-surface-variant">
            Un rol sin permisos es válido, pero no autoriza nada.
          </p>
        </div>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
