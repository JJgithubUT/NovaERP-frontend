import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';

/**
 * Alta y edición de almacén.
 *
 * La baja es lógica, igual que en productos, y con la misma consecuencia
 * práctica: un almacén inactivo deja de ofrecerse en los combos de movimiento,
 * transferencia y confirmación de pedido, pero su historial se conserva.
 *
 * @param {{
 *   almacen?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onDarDeBaja: (almacen: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function AlmacenFormModal({
  almacen = null,
  enviando = false,
  error = null,
  onGuardar,
  onDarDeBaja,
  onCerrar,
}) {
  const esEdicion = almacen !== null;

  const [nombre, setNombre] = useState(almacen?.nombre ?? '');
  const [ubicacion, setUbicacion] = useState(almacen?.ubicacion ?? '');
  const [tocado, setTocado] = useState(false);

  const errorNombre = !nombre.trim() ? 'Este campo es obligatorio.' : '';
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function errorDe(campo) {
    if (campo === 'nombre' && tocado && errorNombre) return errorNombre;
    return campoDeError(error) === campo ? mensajeDeError(error) : '';
  }

  function enviar(evento) {
    evento?.preventDefault();
    if (errorNombre || enviando) {
      setTocado(true);
      return;
    }

    onGuardar({
      nombre: nombre.trim(),
      // `null` y no `''`: el backend distingue "sin ubicación" de cadena vacía.
      ubicacion: ubicacion.trim() || null,
    });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${almacen.nombre}` : 'Nuevo almacén'}
      onCerrar={onCerrar}
      pie={
        <div className="flex w-full items-center gap-2">
          {esEdicion && almacen.activo ? (
            <button
              type="button"
              className="btn btn-peligro mr-auto"
              disabled={enviando}
              onClick={() => onDarDeBaja(almacen)}
            >
              Dar de baja
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
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
        <Campo etiqueta="Nombre" paraId="nombre" error={errorDe('nombre')}>
          <input
            id="nombre"
            className="campo-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo
          etiqueta="Ubicación"
          paraId="ubicacion"
          error={errorDe('ubicacion')}
          ayuda="Opcional. Ayuda a distinguir almacenes con nombres parecidos."
        >
          <input
            id="ubicacion"
            className="campo-control"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
          />
        </Campo>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
