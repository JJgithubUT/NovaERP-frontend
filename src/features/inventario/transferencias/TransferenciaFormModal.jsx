import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * Traslado de existencia entre dos almacenes.
 *
 * El backend lo aplica como salida + entrada **atómicas**: o se registran las
 * dos o ninguna. Nunca queda mercancía "en tránsito" a medio camino, así que no
 * hay un estado intermedio que mostrar.
 *
 * Origen y destino no pueden ser el mismo, y eso se comprueba aquí: es un error
 * evidente para el usuario y no merece un viaje al servidor para descubrirlo.
 *
 * @param {{
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function TransferenciaFormModal({ enviando = false, error = null, onGuardar, onCerrar }) {
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [origen, setOrigen] = useState(/** @type {object | null} */ (null));
  const [destino, setDestino] = useState(/** @type {object | null} */ (null));
  const [cantidad, setCantidad] = useState('1');

  const mismoAlmacen = origen !== null && destino !== null && origen.id === destino.id;
  const cantidadOk = isValidDecimal(cantidad) && toDecimal(cantidad).gt(0);
  const valido =
    producto !== null && origen !== null && destino !== null && !mismoAlmacen && cantidadOk;

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar() {
    if (!valido || enviando) return;
    onGuardar({
      producto_id: producto.id,
      almacen_origen_id: origen.id,
      almacen_destino_id: destino.id,
      cantidad: cantidad.trim(),
    });
  }

  return (
    <Modal
      titulo="Nueva transferencia"
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
            {enviando ? 'Transfiriendo…' : 'Transferir'}
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

      <p className="text-body-sm text-on-surface-variant">
        La salida y la entrada se aplican juntas: o se registran las dos o ninguna.
      </p>

      <EntityCombo
        etiqueta="Producto"
        tipo="producto"
        valor={producto}
        onValor={setProducto}
        marcador="Buscar por SKU o nombre…"
        error={campoDeError(error) === 'producto_id' ? mensajeDeError(error) : ''}
      />

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <EntityCombo
            etiqueta="Desde"
            tipo="almacen"
            valor={origen}
            onValor={setOrigen}
            marcador="Almacén de origen…"
            error={campoDeError(error) === 'almacen_origen_id' ? mensajeDeError(error) : ''}
          />
        </div>
        <ArrowRight size={18} className="mb-3 shrink-0 text-on-surface-variant" />
        <div className="flex-1">
          <EntityCombo
            etiqueta="Hacia"
            tipo="almacen"
            valor={destino}
            onValor={setDestino}
            marcador="Almacén de destino…"
            error={
              mismoAlmacen
                ? 'Debe ser distinto del origen.'
                : campoDeError(error) === 'almacen_destino_id'
                  ? mensajeDeError(error)
                  : ''
            }
          />
        </div>
      </div>

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
      >
        <input
          id="cantidad"
          inputMode="decimal"
          className="campo-control"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </Campo>
    </Modal>
  );
}
