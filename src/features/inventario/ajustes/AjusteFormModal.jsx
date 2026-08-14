import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';
import { MOTIVOS_AJUSTE, MOTIVO_AJUSTE_LABEL } from '../inventario.labels';

/**
 * Ajuste de existencia por conteo físico, merma u otra causa.
 *
 * La cantidad es **con signo**: positiva suma, negativa resta, y cero se
 * rechaza — un ajuste que no ajusta nada solo ensuciaría el kardex. Por eso el
 * campo no lleva el `min="0"` que tienen los demás y en su lugar se explica el
 * significado del signo.
 *
 * Cada ajuste queda auditado con quién lo aprobó: no es una corrección
 * silenciosa del inventario.
 *
 * @param {{
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function AjusteFormModal({ enviando = false, error = null, onGuardar, onCerrar }) {
  const [motivo, setMotivo] = useState('conteo_fisico');
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  const [cantidad, setCantidad] = useState('');

  const cantidadTexto = cantidad.trim();
  const cantidadOk =
    cantidadTexto !== '' && isValidDecimal(cantidadTexto) && !toDecimal(cantidadTexto).eq(0);
  const valido = producto !== null && almacen !== null && cantidadOk;

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  const errorCantidad = (() => {
    if (cantidadTexto === '') return '';
    if (!isValidDecimal(cantidadTexto)) return 'Debe ser un número válido.';
    if (toDecimal(cantidadTexto).eq(0)) return 'Un ajuste de cero no cambia nada.';
    return campoDeError(error) === 'cantidad' ? mensajeDeError(error) : '';
  })();

  function enviar() {
    if (!valido || enviando) return;
    onGuardar({
      motivo,
      producto_id: producto.id,
      almacen_id: almacen.id,
      cantidad: cantidadTexto,
    });
  }

  return (
    <Modal
      titulo="Nuevo ajuste"
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
            {enviando ? 'Aplicando…' : 'Aplicar ajuste'}
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

      <Campo etiqueta="Motivo" paraId="motivo">
        <select
          id="motivo"
          className="campo-control"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        >
          {MOTIVOS_AJUSTE.map((valor) => (
            <option key={valor} value={valor}>
              {MOTIVO_AJUSTE_LABEL[valor]}
            </option>
          ))}
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

      <Campo
        etiqueta="Cantidad a ajustar"
        paraId="cantidad"
        error={errorCantidad}
        ayuda="Con signo: 5 suma cinco unidades, −5 las resta. Cero no se acepta."
      >
        <input
          id="cantidad"
          inputMode="text"
          placeholder="p. ej. -3"
          className="campo-control"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </Campo>
    </Modal>
  );
}
