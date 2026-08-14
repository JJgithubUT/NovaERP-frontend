import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Confirmar } from '../../../shared/ui/Confirmar';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { useClienteNombres } from '../useClienteNombres';
import {
  ESTADO_PEDIDO_LABEL,
  pedidoEsCancelable,
  pedidoEsConfirmable,
  pedidoEsEditable,
  tonoPedido,
} from '../ventas.labels';
import { ConfirmarPedidoModal } from './ConfirmarPedidoModal';
import { PedidoFormModal } from './PedidoFormModal';

const COLUMNAS = 7;

/**
 * Pedidos (RF-38..41).
 *
 * El estado gobierna qué se puede hacer, y las reglas viven en
 * `ventas.labels.js` para que sean las mismas aquí y en cualquier otra
 * pantalla. Lo que conviene recordar al leer esto:
 *
 * - **Confirmar** solo desde borrador: es lo que reserva stock y valida crédito.
 * - **Cancelar** mientras no haya facturas. Con facturas emitidas la corrección
 *   va por nota de crédito, y el backend responde 422.
 * - **Editar** solo en borrador: las líneas se congelan al confirmar.
 */
export function PedidosPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const { cliente } = useClienteNombres();

  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enConfirmacion, setEnConfirmacion] = useState(/** @type {object | null} */ (null));
  const [enCancelacion, setEnCancelacion] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    estado: estado || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'pedidos', filtros),
    queryFn: () => ventasApi.listarPedidos(filtros),
  });

  /**
   * Confirmar y cancelar mueven stock, así que las vistas de inventario también
   * quedan obsoletas. Invalidarlas aquí evita que el usuario vea existencias
   * viejas al cambiar de módulo.
   */
  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'pedidos') });
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'stock') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion ? ventasApi.editarPedido(enEdicion.id, datos) : ventasApi.crearPedido(datos),
    onSuccess: (pedido) => {
      toasts.exito(`Pedido ${pedido.folio} guardado.`);
      refrescar();
      cerrarModal();
    },
  });

  const confirmacion = useMutation({
    mutationFn: (datos) => ventasApi.confirmarPedido(enConfirmacion.id, datos),
    onSuccess: (pedido) => {
      toasts.exito(
        pedido.estado === 'pendiente_surtido'
          ? `${pedido.folio} quedó pendiente de surtido: se reservó lo disponible.`
          : `${pedido.folio} confirmado y stock reservado.`,
      );
      refrescar();
      setEnConfirmacion(null);
    },
    // El error se queda en el modal: distingue crédito de stock y ofrece
    // autorizar cuando procede.
  });

  const cancelacion = useMutation({
    mutationFn: (pedido) => ventasApi.cancelarPedido(pedido.id),
    onSuccess: (pedido) => {
      toasts.exito(`${pedido.folio} cancelado y stock liberado.`);
      refrescar();
      setEnCancelacion(null);
    },
  });

  function abrir(pedido) {
    guardado.reset();
    setEnEdicion(pedido);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
  }

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Pedidos</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Confirmar reserva stock y valida el crédito del cliente.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo pedido
        </button>
      </div>

      <select
        aria-label="Filtrar por estado"
        className="campo-control sm:w-56"
        value={estado}
        onChange={(e) => {
          setEstado(e.target.value);
          setPagina(1);
        }}
      >
        <option value="">Todos los estados</option>
        {Object.entries(ESTADO_PEDIDO_LABEL).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="num">Total</th>
              <th>Fecha</th>
              <th>Almacén</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="No hay pedidos con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="clave">{pedido.folio}</td>
                    <td className="tenue">{cliente(pedido.cliente_id)}</td>
                    <td>
                      <Badge tono={tonoPedido(pedido.estado)}>
                        {ESTADO_PEDIDO_LABEL[pedido.estado]}
                      </Badge>
                    </td>
                    <td className="num">{formatMoneda(pedido.total)}</td>
                    <td className="tenue">{formatFecha(pedido.fecha)}</td>
                    <td className="tenue">{pedido.almacen_id ? '✓' : '—'}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {pedidoEsEditable(pedido.estado) ? (
                          <button type="button" className="btn-fila" onClick={() => abrir(pedido)}>
                            <Pencil size={14} />
                            Editar
                          </button>
                        ) : null}

                        {pedidoEsConfirmable(pedido.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              confirmacion.reset();
                              setEnConfirmacion(pedido);
                            }}
                          >
                            <CheckCircle2 size={14} />
                            Confirmar
                          </button>
                        ) : null}

                        {pedidoEsCancelable(pedido.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              cancelacion.reset();
                              setEnCancelacion(pedido);
                            }}
                          >
                            <Ban size={14} />
                            Cancelar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        <Paginacion
          page={pagina}
          count={consulta.data?.count ?? 0}
          numPages={consulta.data?.num_pages ?? 1}
          onPage={setPagina}
        />
      </div>

      {modalAbierto ? (
        <PedidoFormModal
          pedido={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enConfirmacion ? (
        <ConfirmarPedidoModal
          pedido={enConfirmacion}
          enviando={confirmacion.isPending}
          error={confirmacion.error}
          onConfirmar={(datos) => confirmacion.mutate(datos)}
          onCerrar={() => setEnConfirmacion(null)}
        />
      ) : null}

      {enCancelacion ? (
        <Confirmar
          titulo={`Cancelar ${enCancelacion.folio}`}
          mensaje="El pedido quedará cancelado y no se podrá reabrir."
          detalle={
            enCancelacion.estado === 'borrador'
              ? 'Este pedido aún no reservó stock, así que no hay nada que liberar.'
              : 'Se liberará el stock que este pedido tenía reservado.'
          }
          etiquetaConfirmar="Cancelar pedido"
          peligroso
          enviando={cancelacion.isPending}
          error={cancelacion.error ? mensajeDeError(cancelacion.error) : ''}
          onConfirmar={() => cancelacion.mutate(enCancelacion)}
          onCancelar={() => setEnCancelacion(null)}
        />
      ) : null}
    </div>
  );
}
