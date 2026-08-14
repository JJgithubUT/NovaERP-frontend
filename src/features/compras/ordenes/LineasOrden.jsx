import { Plus, Trash2 } from 'lucide-react';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Big, formatMoneda, isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * @typedef {import('../../../shared/ui/EntityCombo.jsx').OpcionCombo} OpcionCombo
 * @typedef {{ producto: OpcionCombo | null, cantidad: string, costo: string }} LineaOrden
 */

/** @returns {LineaOrden} */
export function lineaOrdenVacia() {
  return { producto: null, cantidad: '1', costo: '' };
}

/**
 * ¿Está la línea lista para enviarse?
 *
 * A diferencia de las líneas de venta, aquí el costo es **obligatorio**: en una
 * compra no hay catálogo del que tomarlo — el precio lo pone el proveedor, y
 * dejarlo en blanco haría que el backend registrara la orden a coste cero.
 *
 * @param {LineaOrden} linea
 */
export function lineaOrdenEsValida(linea) {
  return (
    linea.producto !== null &&
    isValidDecimal(linea.cantidad) &&
    toDecimal(linea.cantidad).gt(0) &&
    isValidDecimal(linea.costo) &&
    toDecimal(linea.costo).gte(0)
  );
}

/**
 * Editor de las líneas de una orden de compra.
 *
 * El total estimado importa más que en ventas: es lo que decide si la orden
 * nacerá en `pendiente_aprobacion` por superar el umbral del tenant. Aquí se
 * puede calcular entero —a diferencia de ventas— porque todas las líneas
 * llevan costo obligatorio.
 *
 * @param {{
 *   lineas: LineaOrden[],
 *   onLineas: (lineas: LineaOrden[]) => void,
 *   umbral?: string | null,
 * }} props
 */
export function LineasOrden({ lineas, onLineas, umbral = null }) {
  const completas = lineas.filter(lineaOrdenEsValida);
  const total = completas.reduce(
    (acumulado, linea) => acumulado.plus(toDecimal(linea.cantidad).times(toDecimal(linea.costo))),
    new Big(0),
  );

  const superaUmbral =
    umbral !== null &&
    isValidDecimal(umbral) &&
    completas.length > 0 &&
    total.gt(toDecimal(umbral));

  /**
   * @param {number} indice
   * @param {Partial<LineaOrden>} cambio
   */
  function actualizar(indice, cambio) {
    onLineas(lineas.map((linea, i) => (i === indice ? { ...linea, ...cambio } : linea)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-label-caps uppercase text-on-surface-variant">Líneas</h3>
        {completas.length > 0 ? (
          <p className="font-mono text-body-sm tabular-nums text-on-surface-variant">
            Total:{' '}
            <span className="font-bold text-on-surface">{formatMoneda(total.toString())}</span>
            {completas.length < lineas.length ? ' (parcial)' : ''}
          </p>
        ) : null}
      </div>

      {superaUmbral ? (
        <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
          El total supera el umbral de {formatMoneda(umbral)}: la orden nacerá pendiente de
          aprobación y no admitirá recepciones hasta que alguien la apruebe.
        </p>
      ) : null}

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
                Costo unitario
              </label>
              <input
                className="campo-control"
                inputMode="decimal"
                placeholder="Obligatorio"
                value={linea.costo}
                onChange={(e) => actualizar(indice, { costo: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secundario self-start"
        onClick={() => onLineas([...lineas, lineaOrdenVacia()])}
      >
        <Plus size={16} />
        Añadir línea
      </button>
    </div>
  );
}
