import { Plus, Trash2 } from 'lucide-react';
import { EntityCombo } from '../../shared/ui/EntityCombo';
import { Big, formatMoneda, isValidDecimal, toDecimal } from '../../shared/utils/decimal.util';

/**
 * @typedef {import('../../shared/ui/EntityCombo.jsx').OpcionCombo} OpcionCombo
 * @typedef {{ producto: OpcionCombo | null, cantidad: string, precio: string }} LineaEditable
 */

/** @returns {LineaEditable} */
export function lineaVacia() {
  return { producto: null, cantidad: '1', precio: '' };
}

/**
 * ¿Está la línea lista para enviarse? Producto elegido y cantidad válida.
 *
 * @param {LineaEditable} linea
 */
export function lineaEsValida(linea) {
  return (
    linea.producto !== null &&
    isValidDecimal(linea.cantidad) &&
    toDecimal(linea.cantidad).gt(0) &&
    (linea.precio.trim() === '' || isValidDecimal(linea.precio))
  );
}

/**
 * Editor de las líneas de una cotización o un pedido.
 *
 * Dejar el precio en blanco no es lo mismo que escribir el del catálogo: en
 * blanco el backend toma `producto.precio_venta`, mientras que enviarlo
 * explícitamente cuenta como **ajuste manual** y exige el permiso
 * `ventas:cotizaciones:ajustar_precio` (→ 403). Por eso el campo solo se manda
 * si el usuario lo escribió, y el texto de ayuda lo advierte.
 *
 * El total que se muestra es una estimación local para dar contexto mientras se
 * captura. El importe bueno lo calcula el backend, que además aplica el
 * descuento y —en la factura— los impuestos.
 *
 * @param {{
 *   lineas: LineaEditable[],
 *   onLineas: (lineas: LineaEditable[]) => void,
 *   mostrarSubtotal?: boolean,
 * }} props
 */
export function LineasEditor({ lineas, onLineas, mostrarSubtotal = true }) {
  const subtotal = calcularSubtotal(lineas, mostrarSubtotal);

  /**
   * @param {number} indice
   * @param {Partial<LineaEditable>} cambio
   */
  function actualizar(indice, cambio) {
    onLineas(lineas.map((linea, i) => (i === indice ? { ...linea, ...cambio } : linea)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-label-caps uppercase text-on-surface-variant">Líneas</h3>
        {subtotal ? (
          <p className="font-mono text-body-sm tabular-nums text-on-surface-variant">
            Subtotal estimado: <span className="font-bold text-on-surface">{subtotal}</span>
          </p>
        ) : null}
      </div>

      {lineas.map((linea, indice) => (
        // El índice como clave es correcto aquí: las líneas no tienen id propio
        // hasta que el backend las crea, y solo se añaden o quitan al final.
        <div
          key={indice}
          className="flex flex-col gap-2 rounded-DEFAULT border border-outline-variant p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-label-md text-on-surface-variant">Línea {indice + 1}</span>
            {lineas.length > 1 ? (
              <button
                type="button"
                aria-label="Quitar línea"
                onClick={() => onLineas(lineas.filter((_, i) => i !== indice))}
                className="text-on-surface-variant transition-colors hover:text-error"
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>

          <EntityCombo
            etiqueta="Producto"
            tipo="producto"
            valor={linea.producto}
            onValor={(producto) => actualizar(indice, { producto })}
            marcador="Buscar por SKU o nombre…"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="campo">
              <label className="text-label-caps uppercase text-on-surface-variant">Cantidad</label>
              <input
                className="campo-control"
                inputMode="decimal"
                value={linea.cantidad}
                onChange={(e) => actualizar(indice, { cantidad: e.target.value })}
              />
            </div>

            <div className="campo">
              <label className="text-label-caps uppercase text-on-surface-variant">
                Precio unitario
              </label>
              <input
                className="campo-control"
                inputMode="decimal"
                placeholder="Del catálogo"
                value={linea.precio}
                onChange={(e) => actualizar(indice, { precio: e.target.value })}
              />
            </div>
          </div>

          {linea.precio.trim() !== '' ? (
            <p className="text-label-md text-on-surface-variant">
              Fijar el precio a mano cuenta como ajuste manual y requiere permiso.
            </p>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secundario self-start"
        onClick={() => onLineas([...lineas, lineaVacia()])}
      >
        <Plus size={16} />
        Añadir línea
      </button>
    </div>
  );
}

/**
 * Suma solo lo que tiene precio explícito y cantidad válida. Las líneas que
 * usan el precio del catálogo no se pueden sumar aquí sin pedir el producto,
 * así que se omiten en vez de contarlas como cero: un total a la baja
 * confundiría más que no enseñar ninguno.
 *
 * @param {LineaEditable[]} lineas
 * @param {boolean} mostrar
 */
function calcularSubtotal(lineas, mostrar) {
  if (!mostrar) return null;

  const conPrecio = lineas.filter(
    (linea) =>
      linea.precio.trim() !== '' && isValidDecimal(linea.precio) && isValidDecimal(linea.cantidad),
  );
  if (conPrecio.length === 0) return null;

  const total = conPrecio.reduce(
    (acumulado, linea) => acumulado.plus(toDecimal(linea.cantidad).times(toDecimal(linea.precio))),
    new Big(0),
  );

  const parcial = conPrecio.length < lineas.length;
  return parcial ? `${formatMoneda(total.toString())} (parcial)` : formatMoneda(total.toString());
}
