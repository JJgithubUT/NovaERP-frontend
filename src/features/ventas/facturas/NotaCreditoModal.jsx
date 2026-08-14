import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import { formatMoneda, isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * Nota de crédito sobre una factura emitida.
 *
 * Es la **única** corrección posible: una factura no se edita ni se borra, por
 * integridad fiscal. El monto no puede superar el saldo de la cuenta por
 * cobrar, y eso se valida aquí además de en el backend para no gastar un viaje
 * en un 422 evitable.
 *
 * `reingresar_stock` solo se ofrece cuando la nota es **total** (el monto agota
 * el saldo): una nota parcial no devuelve mercancía, así que ofrecerlo ahí
 * sugeriría una operación que el backend no hace.
 *
 * @param {{
 *   factura: object,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onConfirmar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function NotaCreditoModal({
  factura,
  enviando = false,
  error = null,
  onConfirmar,
  onCerrar,
}) {
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [reingresar, setReingresar] = useState(false);

  /** Sin CxC (`null`) no hay nada que acreditar. */
  const saldo = factura.cxc_saldo;
  const saldoTexto = saldo === null ? 'Sin cuenta por cobrar' : formatMoneda(saldo);

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  const errorMonto = (() => {
    const valor = monto.trim();
    if (valor !== '') {
      if (!isValidDecimal(valor)) return 'Debe ser un número válido.';
      if (toDecimal(valor).lte(0)) return 'Debe ser mayor que cero.';
      if (saldo !== null && toDecimal(valor).gt(toDecimal(saldo))) {
        return `No puede superar el saldo por cobrar (${formatMoneda(saldo)}).`;
      }
    }
    return campoDeError(error) === 'monto' ? mensajeDeError(error) : '';
  })();

  /** Total = el monto agota el saldo. Solo entonces cabe reingresar stock. */
  const esTotal = (() => {
    const valor = monto.trim();
    if (saldo === null || valor === '' || !isValidDecimal(valor)) return false;
    return toDecimal(valor).eq(toDecimal(saldo));
  })();

  const valido = motivo.trim() !== '' && monto.trim() !== '' && errorMonto === '';

  function enviar() {
    if (!valido || enviando) return;
    onConfirmar({
      motivo: motivo.trim(),
      monto: monto.trim(),
      ...(esTotal && reingresar ? { reingresar_stock: true } : {}),
    });
  }

  return (
    <Modal
      titulo={`Nota de crédito · ${factura.folio}`}
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
            disabled={enviando || !valido}
            onClick={enviar}
          >
            {enviando ? 'Emitiendo…' : 'Emitir nota de crédito'}
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

      <dl className="flex justify-between gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2 text-body-sm">
        <dt className="text-on-surface-variant">Saldo por cobrar</dt>
        <dd className="font-mono font-semibold tabular-nums text-on-surface">{saldoTexto}</dd>
      </dl>

      <Campo
        etiqueta="Motivo"
        paraId="motivo"
        error={campoDeError(error) === 'motivo' ? mensajeDeError(error) : ''}
      >
        <input
          id="motivo"
          className="campo-control"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Monto" paraId="monto" error={errorMonto}>
        <input
          id="monto"
          inputMode="decimal"
          className="campo-control"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </Campo>

      {esTotal ? (
        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input
            type="checkbox"
            checked={reingresar}
            onChange={(e) => setReingresar(e.target.checked)}
          />
          Reingresar la mercancía al inventario
        </label>
      ) : null}
    </Modal>
  );
}
