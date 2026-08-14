import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Confirmar } from '../../../shared/ui/Confirmar';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import {
  ESTADO_ORDEN_LABEL,
  ordenEsAprobable,
  ordenEsCancelable,
  ordenEsEditable,
  pendienteDeOrden,
  tonoOrden,
} from '../compras.labels';
import { useProveedorNombres } from '../useProveedorNombres';
import { OrdenFormModal } from './OrdenFormModal';

const COLUMNAS = 7;

/**
 * Órdenes de compra (FLUJO-COMPRAS §3).
 *
 * Una asimetría del contrato que conviene tener presente: **aprobar no tiene
 * endpoint propio**, es un `PATCH` con `estado: 'enviada'`. Cancelar sí lo
 * tiene. No es un descuido — la aprobación es manual y no dispara efectos,
 * mientras que cancelar cierra la orden a nuevas recepciones.
 */
export function OrdenesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const { proveedor } = useProveedorNombres();

  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enCancelacion, setEnCancelacion] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    estado: estado || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'ordenes-compra', filtros),
    queryFn: () => comprasApi.listarOrdenes(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'ordenes-compra') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion ? comprasApi.editarOrden(enEdicion.id, datos) : comprasApi.crearOrden(datos),
    onSuccess: (orden) => {
      toasts.exito(
        orden.estado === 'pendiente_aprobacion'
          ? `${orden.folio} quedó pendiente de aprobación por superar el umbral.`
          : `Orden ${orden.folio} guardada.`,
      );
      refrescar();
      cerrarModal();
    },
  });

  const aprobacion = useMutation({
    mutationFn: (orden) => comprasApi.aprobarOrden(orden.id),
    onSuccess: (orden) => {
      toasts.exito(`${orden.folio} aprobada. Ya admite recepciones.`);
      refrescar();
    },
    onError: (error) => toasts.error(mensajeDeError(error)),
  });

  const cancelacion = useMutation({
    mutationFn: (orden) => comprasApi.cancelarOrden(orden.id),
    onSuccess: (orden) => {
      toasts.exito(`${orden.folio} cancelada.`);
      refrescar();
      setEnCancelacion(null);
    },
  });

  function abrir(orden) {
    guardado.reset();
    setEnEdicion(orden);
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
          <h2 className="text-headline-sm text-on-surface">Órdenes de compra</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Una orden pendiente de aprobación no admite recepciones: ese es el efecto del umbral.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nueva orden
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
        {Object.entries(ESTADO_ORDEN_LABEL).map(([valor, etiqueta]) => (
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
              <th>Proveedor</th>
              <th>Estado</th>
              <th className="num">Total</th>
              <th className="num">Pendiente</th>
              <th>Fecha</th>
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
              mensajeVacio="No hay órdenes con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((orden) => (
                  <tr key={orden.id}>
                    <td className="clave">{orden.folio}</td>
                    <td className="tenue">{proveedor(orden.proveedor_id)}</td>
                    <td>
                      <Badge tono={tonoOrden(orden.estado)}>
                        {ESTADO_ORDEN_LABEL[orden.estado]}
                      </Badge>
                    </td>
                    <td className="num">{formatMoneda(orden.total)}</td>
                    <td className="num tenue">
                      {formatCantidad(pendienteDeOrden(orden).toString())}
                    </td>
                    <td className="tenue">{formatFecha(orden.created_at)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {ordenEsEditable(orden) ? (
                          <button type="button" className="btn-fila" onClick={() => abrir(orden)}>
                            <Pencil size={14} />
                            Editar
                          </button>
                        ) : null}

                        {ordenEsAprobable(orden.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            disabled={aprobacion.isPending}
                            onClick={() => aprobacion.mutate(orden)}
                          >
                            <Check size={14} />
                            Aprobar
                          </button>
                        ) : null}

                        {ordenEsCancelable(orden.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              cancelacion.reset();
                              setEnCancelacion(orden);
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
        <OrdenFormModal
          orden={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enCancelacion ? (
        <Confirmar
          titulo={`Cancelar ${enCancelacion.folio}`}
          mensaje="La orden se cerrará a nuevas recepciones."
          detalle="Lo que ya se recibió no se toca: el stock y las cuentas por pagar generadas se conservan."
          etiquetaConfirmar="Cancelar orden"
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
