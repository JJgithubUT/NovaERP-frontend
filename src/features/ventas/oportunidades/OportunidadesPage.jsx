import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Flag, Pencil, Plus } from 'lucide-react';
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
  ESTADO_OPORTUNIDAD_LABEL,
  ETAPAS,
  ETAPA_LABEL,
  siguienteEtapa,
  tonoOportunidad,
} from '../ventas.labels';
import { CerrarOportunidadModal } from './CerrarOportunidadModal';
import { OportunidadFormModal } from './OportunidadFormModal';

const COLUMNAS = 8;

/**
 * Listado operable de oportunidades (RF-30..33).
 *
 * Es la vista gemela del Pipeline: los mismos datos, pero en tabla y con las
 * acciones. La etapa **solo avanza a la siguiente** —saltar o retroceder da
 * 422—, y por eso el botón «Avanzar» desaparece en `cierre` en vez de ofrecer
 * algo que el backend va a rechazar.
 */
export function OportunidadesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const { cliente } = useClienteNombres();

  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [etapa, setEtapa] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enCierre, setEnCierre] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    estado: estado || undefined,
    etapa: etapa || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'oportunidades', filtros),
    queryFn: () => ventasApi.listarOportunidades(filtros),
  });

  /** El pipeline es un agregado de esto mismo: se queda obsoleto a la vez. */
  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'oportunidades') });
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'pipeline') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion
        ? // El PATCH no acepta `cliente_id`: mandarlo daría un 400.
          ventasApi.editarOportunidad(enEdicion.id, {
            nombre: datos.nombre,
            valor_estimado: datos.valor_estimado,
            fecha_cierre_estimada: datos.fecha_cierre_estimada,
          })
        : ventasApi.crearOportunidad(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Oportunidad actualizada.' : 'Oportunidad creada.');
      refrescar();
      cerrarModal();
    },
  });

  const avance = useMutation({
    mutationFn: ({ id, etapa: destino }) => ventasApi.avanzarEtapa(id, destino),
    onSuccess: (oportunidad) => {
      toasts.exito(`Etapa avanzada a ${ETAPA_LABEL[oportunidad.etapa]}.`);
      refrescar();
    },
    onError: (error) => toasts.error(mensajeDeError(error)),
  });

  const cierre = useMutation({
    mutationFn: (datos) => ventasApi.cerrarOportunidad(enCierre.id, datos),
    onSuccess: (oportunidad) => {
      toasts.exito(
        oportunidad.estado === 'ganada'
          ? 'Oportunidad ganada.'
          : 'Oportunidad marcada como perdida.',
      );
      refrescar();
      setEnCierre(null);
    },
  });

  function abrir(oportunidad) {
    guardado.reset();
    setEnEdicion(oportunidad);
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
          <h2 className="text-headline-sm text-on-surface">Oportunidades</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            La etapa avanza de una en una y el cierre es definitivo.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nueva oportunidad
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filtrar por estado"
          className="campo-control sm:w-48"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_OPORTUNIDAD_LABEL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por etapa"
          className="campo-control sm:w-48"
          value={etapa}
          onChange={(e) => {
            setEtapa(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas las etapas</option>
          {ETAPAS.map((valor) => (
            <option key={valor} value={valor}>
              {ETAPA_LABEL[valor]}
            </option>
          ))}
        </select>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Oportunidad</th>
              <th>Cliente</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th className="num">Valor</th>
              <th className="num">Ponderado</th>
              <th>Cierre est.</th>
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
              mensajeVacio="No hay oportunidades con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((op) => {
                  const proxima = siguienteEtapa(op.etapa);
                  const abierta = op.estado === 'abierta';

                  return (
                    <tr key={op.id}>
                      <td className="font-medium">{op.nombre}</td>
                      <td className="tenue">{cliente(op.cliente_id)}</td>
                      <td>{ETAPA_LABEL[op.etapa]}</td>
                      <td>
                        <Badge tono={tonoOportunidad(op.estado)}>
                          {ESTADO_OPORTUNIDAD_LABEL[op.estado]}
                        </Badge>
                      </td>
                      <td className="num">{formatMoneda(op.valor_estimado)}</td>
                      <td className="num tenue">{formatMoneda(op.valor_ponderado)}</td>
                      <td className="tenue">{formatFecha(op.fecha_cierre_estimada)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {abierta ? (
                            <>
                              <button type="button" className="btn-fila" onClick={() => abrir(op)}>
                                <Pencil size={14} />
                                Editar
                              </button>

                              {/* Sin siguiente etapa no se ofrece: en `cierre`
                                  el avance solo daría un 422. */}
                              {proxima ? (
                                <button
                                  type="button"
                                  className="btn-fila"
                                  disabled={avance.isPending}
                                  onClick={() => avance.mutate({ id: op.id, etapa: proxima })}
                                >
                                  <ArrowRight size={14} />
                                  {ETAPA_LABEL[proxima]}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                className="btn-fila"
                                onClick={() => {
                                  cierre.reset();
                                  setEnCierre(op);
                                }}
                              >
                                <Flag size={14} />
                                Cerrar
                              </button>
                            </>
                          ) : (
                            <span className="text-label-md text-on-surface-variant">
                              {op.motivo_perdida ?? '—'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
        <OportunidadFormModal
          oportunidad={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enCierre ? (
        <CerrarOportunidadModal
          oportunidad={enCierre}
          enviando={cierre.isPending}
          error={cierre.error}
          onConfirmar={(datos) => cierre.mutate(datos)}
          onCerrar={() => setEnCierre(null)}
        />
      ) : null}
    </div>
  );
}
