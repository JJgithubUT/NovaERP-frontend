import { useState } from 'react';
import { isApiError } from '../../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';

/**
 * Confirmación de un pedido: el paso que reserva stock y valida crédito.
 *
 * El backend puede rechazarlo por dos motivos distintos, y la pantalla los
 * trata distinto porque uno se puede forzar y el otro no:
 *
 * - **`credito`** — el pedido supera el límite del cliente. Se ofrece
 *   reintentar con `autorizar_credito`, que exige el permiso
 *   `finanzas:credito:autorizar`. Sin ese permiso el reintento da 403, y
 *   entonces se dice que hace falta que lo autorice alguien más.
 * - **`stock`** — no hay existencia y el tenant no permite backorder. Ahí no
 *   hay nada que forzar: el error trae el disponible real y el usuario tiene
 *   que ajustar el pedido o reponer inventario.
 *
 * La opción de autorizar no se muestra de entrada. Aparece solo cuando el
 * backend ya dijo que el crédito es el problema: ofrecerla antes invitaría a
 * saltarse un control que la mayoría de las veces ni siquiera aplica.
 *
 * @param {{
 *   pedido: object,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onConfirmar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function ConfirmarPedidoModal({
  pedido,
  enviando = false,
  error = null,
  onConfirmar,
  onCerrar,
}) {
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  const [autorizar, setAutorizar] = useState(false);

  /** El backend ya rechazó por crédito: solo entonces se ofrece forzarlo. */
  const creditoExcedido = campoDeError(error) === 'credito';

  /** El reintento con autorización volvió 403: el actor no tiene el permiso. */
  const faltaPermiso = isApiError(error) && error.status === 403;

  const stockInsuficiente = (() => {
    if (!isApiError(error) || error.field !== 'stock') return null;
    const disponible = error.extra['disponible'];
    return typeof disponible === 'string' ? formatCantidad(disponible) : null;
  })();

  // Crédito y stock ya se explican en sus propios bloques, con más contexto.
  const mensajeError =
    !error || creditoExcedido || stockInsuficiente ? null : mensajeDeError(error);

  function enviar() {
    if (!almacen || enviando) return;
    onConfirmar({
      almacen_id: almacen.id,
      ...(autorizar ? { autorizar_credito: true } : {}),
    });
  }

  return (
    <Modal
      titulo={`Confirmar ${pedido.folio}`}
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
            disabled={enviando || !almacen}
            onClick={enviar}
          >
            {enviando ? 'Confirmando…' : autorizar ? 'Autorizar y confirmar' : 'Confirmar'}
          </button>
        </>
      }
    >
      {mensajeError ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {mensajeError}
        </p>
      ) : null}

      <p className="text-body-sm text-on-surface-variant">
        Al confirmar se reserva el stock del almacén elegido y se valida el crédito del cliente.
        Total del pedido: <strong className="text-on-surface">{formatMoneda(pedido.total)}</strong>.
      </p>

      <EntityCombo
        etiqueta="Almacén de surtido"
        tipo="almacen"
        valor={almacen}
        onValor={setAlmacen}
        marcador="Buscar almacén…"
      />

      {creditoExcedido ? (
        <div className="flex flex-col gap-2 rounded-DEFAULT border border-warning bg-warning-container px-3 py-2">
          <p className="text-body-sm text-on-warning-container">
            Este pedido supera el límite de crédito del cliente.
          </p>

          {faltaPermiso ? (
            <p className="text-body-sm text-on-warning-container">
              No tienes el permiso para autorizarlo. Pide a alguien con{' '}
              <code className="font-mono">finanzas:credito:autorizar</code> que confirme el pedido.
            </p>
          ) : (
            <label className="flex items-center gap-2 text-body-sm text-on-warning-container">
              <input
                type="checkbox"
                checked={autorizar}
                onChange={(e) => setAutorizar(e.target.checked)}
              />
              Autorizar el crédito y confirmar de todos modos
            </label>
          )}
        </div>
      ) : null}

      {stockInsuficiente ? (
        <div className="rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2">
          <p className="text-body-sm text-on-surface-variant">
            Sin existencia suficiente y el backorder está deshabilitado. Disponible en el almacén:{' '}
            <strong className="font-mono text-on-surface">{stockInsuficiente}</strong>.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
