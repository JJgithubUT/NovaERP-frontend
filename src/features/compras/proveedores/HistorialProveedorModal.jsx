import { useQuery } from '@tanstack/react-query';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Modal } from '../../../shared/ui/Modal';
import { Big, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { ESTADO_ORDEN_LABEL, tonoOrden } from '../compras.labels';

/**
 * Ficha completa de un proveedor (RF-51): órdenes, recepciones y cuentas por
 * pagar en un solo lugar.
 *
 * El endpoint devuelve las tres listas **sin paginar**, así que aquí no hay
 * paginación que ofrecer. Es deliberado del contrato: la ficha está pensada
 * para responder «¿cómo vamos con este proveedor?» de un vistazo, no para
 * navegar un histórico largo.
 *
 * @param {{ proveedor: object, onCerrar: () => void }} props
 */
export function HistorialProveedorModal({ proveedor, onCerrar }) {
  const tenantSlug = useTenantSlug() ?? '';

  const consulta = useQuery({
    queryKey: qk.detalle(tenantSlug, 'proveedores', `${proveedor.id}-historial`),
    queryFn: () => comprasApi.historialProveedor(proveedor.id),
  });

  const datos = consulta.data;

  const saldoTotal = (datos?.cuentas_por_pagar ?? []).reduce(
    (suma, cxp) => suma.plus(toDecimal(cxp.saldo)),
    new Big(0),
  );

  return (
    <Modal
      titulo={`Historial · ${proveedor.razon_social}`}
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>
          Cerrar
        </button>
      }
    >
      {consulta.fetchStatus === 'paused' ? (
        <p className="text-body-sm text-error">Sin conexión con el servidor.</p>
      ) : consulta.isPending ? (
        <p className="text-body-sm text-on-surface-variant">Cargando historial…</p>
      ) : consulta.error ? (
        <p className="text-body-sm text-error">
          {mensajeDeError(consulta.error, 'No se pudo cargar el historial.')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Resumen etiqueta="Órdenes" valor={String(datos.ordenes.length)} />
            <Resumen etiqueta="Recepciones" valor={String(datos.recepciones.length)} />
            <Resumen etiqueta="Saldo por pagar" valor={formatMoneda(saldoTotal.toString())} />
          </div>

          <Seccion titulo="Órdenes de compra">
            {datos.ordenes.length === 0 ? (
              <Vacio>Sin órdenes registradas.</Vacio>
            ) : (
              datos.ordenes.map((orden) => (
                <li
                  key={orden.id}
                  className="flex items-center justify-between gap-3 border-t border-outline-variant py-2 first:border-t-0"
                >
                  <span className="font-mono text-body-sm font-semibold">{orden.folio}</span>
                  <Badge tono={tonoOrden(orden.estado)}>{ESTADO_ORDEN_LABEL[orden.estado]}</Badge>
                  <span className="font-mono text-body-sm tabular-nums">
                    {formatMoneda(orden.total)}
                  </span>
                  <span className="text-label-md text-on-surface-variant">
                    {formatFecha(orden.created_at)}
                  </span>
                </li>
              ))
            )}
          </Seccion>

          <Seccion titulo="Recepciones">
            {datos.recepciones.length === 0 ? (
              <Vacio>Sin recepciones registradas.</Vacio>
            ) : (
              datos.recepciones.map((recepcion) => (
                <li
                  key={recepcion.id}
                  className="flex items-center justify-between gap-3 border-t border-outline-variant py-2 first:border-t-0"
                >
                  <span className="text-body-sm">
                    {recepcion.lineas.length} {recepcion.lineas.length === 1 ? 'línea' : 'líneas'}
                  </span>
                  <span className="text-label-md text-on-surface-variant">
                    {formatFecha(recepcion.created_at)}
                  </span>
                </li>
              ))
            )}
          </Seccion>

          <Seccion titulo="Cuentas por pagar">
            {datos.cuentas_por_pagar.length === 0 ? (
              <Vacio>Sin deuda registrada.</Vacio>
            ) : (
              datos.cuentas_por_pagar.map((cxp) => (
                <li
                  key={cxp.id}
                  className="flex items-center justify-between gap-3 border-t border-outline-variant py-2 first:border-t-0"
                >
                  <span className="text-body-sm text-on-surface-variant">{cxp.origen_tipo}</span>
                  <span className="font-mono text-body-sm tabular-nums">
                    {formatMoneda(cxp.monto_original)}
                  </span>
                  <span
                    className={`font-mono text-body-sm font-semibold tabular-nums ${
                      toDecimal(cxp.saldo).gt(0) ? 'text-error' : 'text-success'
                    }`}
                  >
                    {formatMoneda(cxp.saldo)}
                  </span>
                </li>
              ))
            )}
          </Seccion>
        </>
      )}
    </Modal>
  );
}

function Resumen({ etiqueta, valor }) {
  return (
    <div className="rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2">
      <p className="text-label-caps uppercase text-on-surface-variant">{etiqueta}</p>
      <p className="font-mono text-lg font-bold tabular-nums text-on-surface">{valor}</p>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section>
      <h3 className="mb-1 text-label-caps uppercase text-on-surface-variant">{titulo}</h3>
      <ul className="rounded-DEFAULT border border-outline-variant px-3">{children}</ul>
    </section>
  );
}

function Vacio({ children }) {
  return <li className="py-3 text-center text-body-sm text-on-surface-variant">{children}</li>;
}
