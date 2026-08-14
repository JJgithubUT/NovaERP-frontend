import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import {
  Big,
  formatCantidad,
  formatMoneda,
  isValidDecimal,
  toDecimal,
} from '../../../shared/utils/decimal.util';
import { ordenEsRecibible, pendienteDeLinea } from '../compras.labels';
import { useCatalogoNombres } from '../../inventario/useCatalogoNombres';

const MAX_ORDENES = 100;

/**
 * Registro de una recepción de mercancía.
 *
 * Es **el paso que mueve todo** y su efecto es irreversible: suma stock al
 * almacén elegido, recalcula el costo de referencia del producto y crea la
 * cuenta por pagar del proveedor. No hay endpoint para deshacerla.
 *
 * Dos cuidados propios de esta pantalla:
 *
 * - **El costo se manda siempre.** El contrato lo marca opcional, pero si se
 *   omite el backend toma cero y con ese cero recalcula el `costo_referencia`
 *   del producto — dejando el catálogo valuado a cero. Por eso aquí es un campo
 *   obligatorio, precargado con el costo de la orden.
 * - **No se puede recibir más de lo pendiente** de cada línea (→ 422). Se
 *   valida en local para no gastar un viaje en un error evitable.
 *
 * @param {{
 *   ordenInicial?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function RecepcionFormModal({
  ordenInicial = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const tenantSlug = useTenantSlug() ?? '';
  const nombres = useCatalogoNombres();

  const [ordenId, setOrdenId] = useState(ordenInicial?.id ?? '');
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  /** @type {[Record<string, {cantidad: string, costo: string}>, Function]} */
  const [lineas, setLineas] = useState({});

  const filtros = { page_size: MAX_ORDENES };
  const recibibles = useQuery({
    queryKey: [...qk.lista(tenantSlug, 'ordenes-compra', filtros), 'recibibles'],
    enabled: tenantSlug !== '',
    queryFn: () =>
      comprasApi
        .listarOrdenes(filtros)
        .then((pagina) =>
          pagina.results.filter(
            (orden) =>
              ordenEsRecibible(orden.estado) &&
              orden.lineas.some((linea) => pendienteDeLinea(linea).gt(0)),
          ),
        ),
  });

  const orden = (recibibles.data ?? []).find((o) => o.id === ordenId) ?? null;

  /** @param {string} lineaId @param {'cantidad'|'costo'} campo @param {string} valor */
  function fijar(lineaId, campo, valor) {
    setLineas((actual) => ({
      ...actual,
      [lineaId]: { ...(actual[lineaId] ?? { cantidad: '', costo: '' }), [campo]: valor },
    }));
  }

  /** Precarga el costo de la orden al elegirla: es el valor esperado por defecto. */
  function elegirOrden(id) {
    setOrdenId(id);
    const elegida = (recibibles.data ?? []).find((o) => o.id === id);
    if (!elegida) {
      setLineas({});
      return;
    }
    setLineas(
      Object.fromEntries(
        elegida.lineas.map((linea) => [linea.id, { cantidad: '', costo: linea.costo_unitario }]),
      ),
    );
  }

  const errorLineas = (() => {
    if (!orden) return null;

    let algo = new Big(0);
    for (const linea of orden.lineas) {
      const entrada = lineas[linea.id];
      const cantidad = (entrada?.cantidad ?? '').trim();
      if (cantidad === '') continue;

      if (!isValidDecimal(cantidad)) return 'Hay cantidades que no son números válidos.';
      if (toDecimal(cantidad).lte(0)) return 'Las cantidades deben ser mayores que cero.';
      if (toDecimal(cantidad).gt(pendienteDeLinea(linea))) {
        return 'No se puede recibir más de lo pendiente en una línea.';
      }

      const costo = (entrada?.costo ?? '').trim();
      if (costo === '' || !isValidDecimal(costo)) {
        return 'Indica el costo real de cada línea que recibas.';
      }

      algo = algo.plus(toDecimal(cantidad));
    }

    return algo.eq(0) ? 'Indica al menos una cantidad a recibir.' : null;
  })();

  const valido = ordenId !== '' && almacen !== null && errorLineas === null;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar() {
    if (!valido || enviando) return;

    const cuerpo = Object.entries(lineas)
      .filter(([, v]) => v.cantidad.trim() !== '' && toDecimal(v.cantidad).gt(0))
      .map(([orden_compra_linea_id, v]) => ({
        orden_compra_linea_id,
        cantidad: v.cantidad.trim(),
        costo_unitario: v.costo.trim(),
      }));

    onGuardar({ orden_id: ordenId, almacen_id: almacen.id, lineas: cuerpo });
  }

  return (
    <Modal
      titulo="Nueva recepción"
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
            {enviando ? 'Registrando…' : 'Registrar recepción'}
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
        Al registrarla se suma el stock, se recalcula el costo del producto y se crea la cuenta por
        pagar. No se puede deshacer.
      </p>

      <Campo
        etiqueta="Orden de compra"
        paraId="orden"
        error={campoDeError(error) === 'orden_id' ? mensajeDeError(error) : ''}
        ayuda="Solo aparecen las órdenes aprobadas con algo pendiente de recibir."
      >
        <select
          id="orden"
          className="campo-control"
          value={ordenId}
          onChange={(e) => elegirOrden(e.target.value)}
        >
          <option value="">
            {recibibles.isPending ? 'Cargando órdenes…' : 'Selecciona una orden…'}
          </option>
          {(recibibles.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.folio} · {formatMoneda(o.total)}
            </option>
          ))}
        </select>
      </Campo>

      <EntityCombo
        etiqueta="Almacén de entrada"
        tipo="almacen"
        valor={almacen}
        onValor={setAlmacen}
        marcador="Buscar almacén…"
        error={campoDeError(error) === 'almacen_id' ? mensajeDeError(error) : ''}
      />

      {orden ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-label-caps uppercase text-on-surface-variant">Líneas a recibir</h3>

          {orden.lineas.map((linea) => {
            const pendiente = pendienteDeLinea(linea);
            if (pendiente.eq(0)) return null;

            return (
              <div
                key={linea.id}
                className="flex flex-col gap-2 rounded-DEFAULT border border-outline-variant p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-body-sm text-on-surface">
                    {nombres.producto(linea.producto_id)}
                  </span>
                  <span className="shrink-0 text-label-md text-on-surface-variant">
                    Pendiente: {formatCantidad(pendiente.toString())}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="campo">
                    <label className="text-label-caps uppercase text-on-surface-variant">
                      Cantidad recibida
                    </label>
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      className="campo-control"
                      value={lineas[linea.id]?.cantidad ?? ''}
                      onChange={(e) => fijar(linea.id, 'cantidad', e.target.value)}
                    />
                  </div>

                  <div className="campo">
                    <label className="text-label-caps uppercase text-on-surface-variant">
                      Costo real
                    </label>
                    <input
                      inputMode="decimal"
                      className="campo-control"
                      value={lineas[linea.id]?.costo ?? ''}
                      onChange={(e) => fijar(linea.id, 'costo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {errorLineas ? <p className="campo-error">{errorLineas}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}
