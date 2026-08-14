import { Modal } from './Modal';

/**
 * Confirmación de una acción consecuente.
 *
 * Se usa para lo que no se deshace con otro clic: cancelar un pedido que libera
 * stock reservado, suspender a alguien, cerrarle las sesiones. El texto debe
 * decir **qué le pasa a la persona o al dato afectado**, no solo "¿estás
 * seguro?" — es la diferencia entre confirmar a ciegas y confirmar sabiendo.
 *
 * No sustituye al manejo del error: el backend sigue pudiendo rechazar la
 * acción (p. ej. el último administrador activo → 422).
 *
 * @param {{
 *   titulo: string,
 *   mensaje: string,
 *   detalle?: string,
 *   etiquetaConfirmar?: string,
 *   peligroso?: boolean,
 *   enviando?: boolean,
 *   error?: string,
 *   onConfirmar: () => void,
 *   onCancelar: () => void,
 * }} props
 */
export function Confirmar({
  titulo,
  mensaje,
  detalle = '',
  etiquetaConfirmar = 'Confirmar',
  peligroso = false,
  enviando = false,
  error = '',
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal
      titulo={titulo}
      onCerrar={onCancelar}
      pie={
        <>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={peligroso ? 'btn btn-peligro' : 'btn btn-primario'}
            disabled={enviando}
            onClick={onConfirmar}
          >
            {enviando ? 'Procesando…' : etiquetaConfirmar}
          </button>
        </>
      }
    >
      {error ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {error}
        </p>
      ) : null}

      <p className="text-body-md text-on-surface">{mensaje}</p>

      {detalle ? <p className="text-body-sm text-on-surface-variant">{detalle}</p> : null}
    </Modal>
  );
}
