import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import {
  Big,
  formatCantidad,
  formatMoneda,
  isValidDecimal,
  toDecimal,
} from '../../../shared/utils/decimal.util';

const MAX_PEDIDOS = 100;

/** Estados en los que un pedido todavía puede facturarse. */
const FACTURABLES = ['confirmado', 'pendiente_surtido', 'facturado_parcial'];

/**
 * Emisión de factura a partir de un pedido.
 *
 * Es el paso que convierte la reserva en salida definitiva de inventario y crea
 * la cuenta por cobrar. **No se edita ni se borra después** (integridad
 * fiscal): la única corrección es una nota de crédito.
 *
 * Dos modos:
 *
 * - **Total** — sin `lineas`, el backend factura todo lo pendiente y reservado.
 * - **Parcial** — se indica cuánto de cada línea. No se puede facturar más de
 *   lo pendiente, y eso se valida aquí para no gastar un viaje en un 422
 *   evitable.
 *
 * @param {{
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function FacturaFormModal({ enviando = false, error = null, onGuardar, onCerrar }) {
  const tenantSlug = useTenantSlug() ?? '';

  const [pedidoId, setPedidoId] = useState('');
  const [modo, setModo] = useState('total');
  const [cantidades, setCantidades] = useState(/** @type {Record<string,string>} */ ({}));

  const filtros = { page_size: MAX_PEDIDOS };
  const facturables = useQuery({
    queryKey: [...qk.lista(tenantSlug, 'pedidos', filtros), 'facturables'],
    enabled: tenantSlug !== '',
    queryFn: () =>
      ventasApi.listarPedidos(filtros).then((pagina) =>
        // El backend no tiene un filtro "facturable", así que se acota aquí:
        // confirmados o parcialmente facturados, y con algo pendiente.
        pagina.results.filter(
          (pedido) =>
            FACTURABLES.includes(pedido.estado) &&
            pedido.lineas.some((linea) => toDecimal(linea.pendiente_facturar).gt(0)),
        ),
      ),
  });

  const pedidoElegido = (facturables.data ?? []).find((p) => p.id === pedidoId) ?? null;

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  /** Valida RN01 en local para no gastar un viaje en un 422 evitable. */
  const errorParcial = (() => {
    if (modo !== 'parcial' || !pedidoElegido) return null;

    for (const linea of pedidoElegido.lineas) {
      const valor = (cantidades[linea.id] ?? '').trim();
      if (valor === '') continue;
      if (!isValidDecimal(valor)) return 'Hay cantidades que no son números válidos.';
      if (toDecimal(valor).gt(toDecimal(linea.pendiente_facturar))) {
        return 'No se puede facturar más de lo pendiente en una línea.';
      }
    }

    const total = Object.values(cantidades).reduce((suma, valor) => {
      const limpio = valor.trim();
      return limpio !== '' && isValidDecimal(limpio) ? suma.plus(toDecimal(limpio)) : suma;
    }, new Big(0));

    return total.eq(0) ? 'Indica al menos una cantidad a facturar.' : null;
  })();

  const valido = pedidoId !== '' && (modo === 'total' || errorParcial === null);

  function enviar() {
    if (!valido || enviando) return;

    if (modo === 'total') {
      // Sin `lineas` el backend factura todo lo pendiente y reservado.
      onGuardar({ pedido_id: pedidoId });
      return;
    }

    const lineas = Object.entries(cantidades)
      .filter(([, valor]) => valor.trim() !== '' && toDecimal(valor).gt(0))
      .map(([pedido_linea_id, cantidad]) => ({ pedido_linea_id, cantidad: cantidad.trim() }));

    onGuardar({ pedido_id: pedidoId, lineas });
  }

  return (
    <Modal
      titulo="Nueva factura"
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
            {enviando ? 'Emitiendo…' : 'Emitir factura'}
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
        Al emitirla se descuenta el stock reservado y se crea la cuenta por cobrar. Una factura
        emitida no se edita ni se elimina.
      </p>

      <Campo
        etiqueta="Pedido"
        paraId="pedido"
        error={campoDeError(error) === 'pedido_id' ? mensajeDeError(error) : ''}
      >
        <select
          id="pedido"
          className="campo-control"
          value={pedidoId}
          onChange={(e) => {
            setPedidoId(e.target.value);
            setCantidades({});
          }}
        >
          <option value="">
            {facturables.isPending ? 'Cargando pedidos…' : 'Selecciona un pedido…'}
          </option>
          {(facturables.data ?? []).map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              {pedido.folio} · {formatMoneda(pedido.total)}
            </option>
          ))}
        </select>
      </Campo>

      {pedidoElegido ? (
        <>
          <Campo etiqueta="Alcance" paraId="modo">
            <select
              id="modo"
              className="campo-control"
              value={modo}
              onChange={(e) => setModo(e.target.value)}
            >
              <option value="total">Facturar todo lo pendiente</option>
              <option value="parcial">Facturar cantidades concretas</option>
            </select>
          </Campo>

          {modo === 'parcial' ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-label-caps uppercase text-on-surface-variant">Líneas</h3>

              {pedidoElegido.lineas.map((linea) => (
                <div
                  key={linea.id}
                  className="flex items-center justify-between gap-3 rounded-DEFAULT border border-outline-variant p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-sm text-on-surface">{linea.descripcion}</p>
                    <p className="text-label-md text-on-surface-variant">
                      Pendiente: {formatCantidad(linea.pendiente_facturar)}
                    </p>
                  </div>
                  <input
                    inputMode="decimal"
                    aria-label={`Cantidad a facturar de ${linea.descripcion}`}
                    placeholder="0"
                    className="campo-control w-28 text-right"
                    value={cantidades[linea.id] ?? ''}
                    onChange={(e) =>
                      setCantidades((actual) => ({ ...actual, [linea.id]: e.target.value }))
                    }
                  />
                </div>
              ))}

              {errorParcial ? <p className="campo-error">{errorParcial}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
