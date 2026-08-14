import { useState } from 'react';
import { isApiError } from '../../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { formatCantidad, isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * Entrada o salida manual de inventario.
 *
 * Solo se ofrecen estos dos tipos, y no es una simplificación: los otros cuatro
 * (`ajuste_*`, `transferencia_*`) los **deriva el backend** al procesar un
 * ajuste o una transferencia. Ofrecerlos aquí permitiría escribir un kardex que
 * no corresponde a ninguna operación real.
 *
 * Una salida que dejaría el stock negativo se rechaza con 422; el error trae el
 * disponible real y se muestra junto al campo de cantidad.
 *
 * @param {{
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function MovimientoFormModal({ enviando = false, error = null, onGuardar, onCerrar }) {
  const [tipo, setTipo] = useState('entrada');
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('');

  const cantidadOk = isValidDecimal(cantidad) && toDecimal(cantidad).gt(0);
  const costoOk = costo.trim() === '' || isValidDecimal(costo);
  const valido = producto !== null && almacen !== null && cantidadOk && costoOk;

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  /** El 422 por stock insuficiente trae el disponible: se dice cuánto hay. */
  const disponible = (() => {
    if (!isApiError(error)) return null;
    const valor = error.extra['disponible'];
    return typeof valor === 'string' ? formatCantidad(valor) : null;
  })();

  function enviar() {
    if (!valido || enviando) return;
    onGuardar({
      tipo,
      producto_id: producto.id,
      almacen_id: almacen.id,
      cantidad: cantidad.trim(),
      ...(costo.trim() === '' ? {} : { costo_unitario: costo.trim() }),
    });
  }

  return (
    <Modal
      titulo="Nuevo movimiento"
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
            {enviando ? 'Registrando…' : 'Registrar'}
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

      <Campo etiqueta="Tipo" paraId="tipo">
        <select
          id="tipo"
          className="campo-control"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </Campo>

      <EntityCombo
        etiqueta="Producto"
        tipo="producto"
        valor={producto}
        onValor={setProducto}
        marcador="Buscar por SKU o nombre…"
        error={campoDeError(error) === 'producto_id' ? mensajeDeError(error) : ''}
      />

      <EntityCombo
        etiqueta="Almacén"
        tipo="almacen"
        valor={almacen}
        onValor={setAlmacen}
        marcador="Buscar almacén…"
        error={campoDeError(error) === 'almacen_id' ? mensajeDeError(error) : ''}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Cantidad"
          paraId="cantidad"
          error={
            cantidad !== '' && !cantidadOk
              ? 'Debe ser un número mayor que cero.'
              : campoDeError(error) === 'cantidad'
                ? mensajeDeError(error)
                : ''
          }
          ayuda={disponible ? `Disponible ahora: ${disponible}.` : ''}
        >
          <input
            id="cantidad"
            inputMode="decimal"
            className="campo-control"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Costo unitario"
          paraId="costo"
          error={!costoOk ? 'Debe ser un número válido.' : ''}
          ayuda="Opcional. Solo tiene sentido en las entradas."
        >
          <input
            id="costo"
            inputMode="decimal"
            className="campo-control"
            placeholder="—"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </Campo>
      </div>
    </Modal>
  );
}
