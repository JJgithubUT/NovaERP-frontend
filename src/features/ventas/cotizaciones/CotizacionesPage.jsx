import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { useClienteNombres } from '../useClienteNombres';
import {
  ESTADO_COTIZACION_LABEL,
  cotizacionEsAprobable,
  cotizacionEsEditable,
  cotizacionEsResoluble,
  tonoCotizacion,
} from '../ventas.labels';
import { CotizacionFormModal } from './CotizacionFormModal';

const COLUMNAS = 8;

/**
 * Cotizaciones (RF-34..37).
 *
 * `vencida` es un booleano **derivado** de `vigente_hasta`, no un estado
 * almacenado: por eso una cotización puede estar en `pendiente_aprobacion` y
 * vencida a la vez. Cuando lo está, se ofrece rechazar pero no aprobar —
 * aprobar una vencida devuelve 422.
 */
export function CotizacionesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const { cliente } = useClienteNombres();

  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    estado: estado || undefined,
    vencida: soloVencidas ? true : undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'cotizaciones', filtros),
    queryFn: () => ventasApi.listarCotizaciones(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'cotizaciones') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion
        ? // El PATCH no acepta `cliente_id`; solo descuento, vigencia y líneas.
          ventasApi.editarCotizacion(enEdicion.id, {
            descuento_pct: datos.descuento_pct,
            vigente_hasta: datos.vigente_hasta,
            lineas: datos.lineas,
          })
        : ventasApi.crearCotizacion(datos),
    onSuccess: (cotizacion) => {
      toasts.exito(
        cotizacion.estado === 'pendiente_aprobacion'
          ? `${cotizacion.folio} quedó pendiente de aprobación por el descuento.`
          : `Cotización ${cotizacion.folio} guardada.`,
      );
      refrescar();
      cerrarModal();
    },
  });

  const resolucion = useMutation({
    mutationFn: ({ id, decision }) => ventasApi.resolverCotizacion(id, { decision }),
    onSuccess: (cotizacion) => {
      toasts.exito(
        cotizacion.estado === 'aprobada'
          ? `${cotizacion.folio} aprobada. Ya se puede convertir en pedido.`
          : `${cotizacion.folio} rechazada.`,
      );
      refrescar();
    },
    onError: (error) => toasts.error(mensajeDeError(error)),
  });

  function abrir(cotizacion) {
    guardado.reset();
    setEnEdicion(cotizacion);
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
          <h2 className="text-headline-sm text-on-surface">Cotizaciones</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Una cotización vencida ya no se puede aprobar, solo rechazar.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nueva cotización
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
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
          {Object.entries(ESTADO_COTIZACION_LABEL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input
            type="checkbox"
            checked={soloVencidas}
            onChange={(e) => {
              setSoloVencidas(e.target.checked);
              setPagina(1);
            }}
          />
          Solo vencidas
        </label>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="num">Descuento</th>
              <th className="num">Total</th>
              <th>Vigente hasta</th>
              <th>Vencida</th>
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
              mensajeVacio="No hay cotizaciones con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((cot) => (
                  <tr key={cot.id}>
                    <td className="clave">{cot.folio}</td>
                    <td className="tenue">{cliente(cot.cliente_id)}</td>
                    <td>
                      <Badge tono={tonoCotizacion(cot.estado)}>
                        {ESTADO_COTIZACION_LABEL[cot.estado]}
                      </Badge>
                    </td>
                    <td className="num tenue">{cot.descuento_pct}%</td>
                    <td className="num">{formatMoneda(cot.total)}</td>
                    <td className="tenue">{formatFecha(cot.vigente_hasta)}</td>
                    <td>{cot.vencida ? <Badge tono="aviso">Vencida</Badge> : '—'}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {cotizacionEsEditable(cot.estado) ? (
                          <button type="button" className="btn-fila" onClick={() => abrir(cot)}>
                            <Pencil size={14} />
                            Editar
                          </button>
                        ) : null}

                        {/* Aprobar solo si además no está vencida: el backend
                            rechaza con 422 la aprobación de una vencida. */}
                        {cotizacionEsAprobable(cot.estado, cot.vencida) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            disabled={resolucion.isPending}
                            onClick={() => resolucion.mutate({ id: cot.id, decision: 'aprobar' })}
                          >
                            <Check size={14} />
                            Aprobar
                          </button>
                        ) : null}

                        {cotizacionEsResoluble(cot.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            disabled={resolucion.isPending}
                            onClick={() => resolucion.mutate({ id: cot.id, decision: 'rechazar' })}
                          >
                            <X size={14} />
                            Rechazar
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
        <CotizacionFormModal
          cotizacion={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}
    </div>
  );
}
