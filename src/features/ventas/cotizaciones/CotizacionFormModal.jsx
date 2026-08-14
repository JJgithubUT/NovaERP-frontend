import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';
import { LineasEditor, lineaEsValida, lineaVacia } from '../LineasEditor';

/**
 * Alta y edición de cotización.
 *
 * Dos reglas del backend que la pantalla refleja:
 *
 * - Al editar no se puede cambiar el cliente: el PATCH solo acepta descuento,
 *   vigencia y líneas.
 * - Si el descuento supera el máximo del tenant, la cotización **nace en
 *   `pendiente_aprobacion`**. No se puede saber aquí cuál es ese máximo, así
 *   que no se avisa antes: lo dice el toast al guardar.
 *
 * @param {{
 *   cotizacion?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function CotizacionFormModal({
  cotizacion = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const esEdicion = cotizacion !== null;

  const [cliente, setCliente] = useState(/** @type {object | null} */ (null));
  const [descuento, setDescuento] = useState(cotizacion?.descuento_pct ?? '0');
  const [vigencia, setVigencia] = useState(cotizacion?.vigente_hasta ?? '');
  const [lineas, setLineas] = useState(() =>
    cotizacion
      ? cotizacion.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.descripcion },
          cantidad: linea.cantidad,
          precio: linea.precio_unitario,
        }))
      : [lineaVacia()],
  );

  const descuentoTexto = descuento.trim();
  const descuentoOk = descuentoTexto === '' || enRango(descuentoTexto);

  const clienteOk = esEdicion || cliente !== null;
  const valido = clienteOk && lineas.length > 0 && lineas.every(lineaEsValida) && descuentoOk;

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  const errorDescuento = !descuentoOk
    ? 'Debe ser un número entre 0 y 100.'
    : campoDeError(error) === 'descuento_pct'
      ? mensajeDeError(error)
      : '';

  function enviar() {
    if (!valido || enviando) return;

    onGuardar({
      cliente_id: cliente?.id ?? cotizacion?.cliente_id ?? '',
      ...(descuentoTexto === '' ? {} : { descuento_pct: descuentoTexto }),
      ...(vigencia === '' ? {} : { vigente_hasta: vigencia }),
      lineas: lineas.map((linea) => ({
        producto_id: linea.producto.id,
        cantidad: linea.cantidad.trim(),
        // Solo si se escribió: mandarlo cuenta como ajuste manual de precio.
        ...(linea.precio.trim() === '' ? {} : { precio_unitario: linea.precio.trim() }),
      })),
    });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${cotizacion.folio}` : 'Nueva cotización'}
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
            className="btn btn-primario"
            disabled={enviando || !valido}
            onClick={enviar}
          >
            {enviando ? 'Guardando…' : 'Guardar'}
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

      {esEdicion ? null : (
        <EntityCombo
          etiqueta="Cliente"
          tipo="cliente"
          valor={cliente}
          onValor={setCliente}
          marcador="Buscar por razón social…"
          error={campoDeError(error) === 'cliente_id' ? mensajeDeError(error) : ''}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Descuento (%)"
          paraId="descuento"
          error={errorDescuento}
          ayuda="Si supera el máximo de la empresa, nacerá pendiente de aprobación."
        >
          <input
            id="descuento"
            inputMode="decimal"
            className="campo-control"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Vigente hasta"
          paraId="vigencia"
          error={campoDeError(error) === 'vigente_hasta' ? mensajeDeError(error) : ''}
          ayuda="Pasada esta fecha ya no se podrá aprobar."
        >
          <input
            id="vigencia"
            type="date"
            className="campo-control"
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value)}
          />
        </Campo>
      </div>

      <LineasEditor lineas={lineas} onLineas={setLineas} />
    </Modal>
  );
}

/** @param {string} valor */
function enRango(valor) {
  if (!isValidDecimal(valor)) return false;
  const decimal = toDecimal(valor);
  return decimal.gte(0) && decimal.lte(100);
}
