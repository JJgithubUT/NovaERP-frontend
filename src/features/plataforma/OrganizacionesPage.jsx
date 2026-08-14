import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Blocks, Pencil, Plus, RotateCcw, Send } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../api/models/common.model';
import * as plataformaApi from '../../api/services/plataforma.api';
import { mensajeDeError } from '../../core/errors/mensaje-error';
import { Badge } from '../../shared/ui/Badge';
import { Buscador } from '../../shared/ui/Buscador';
import { Confirmar } from '../../shared/ui/Confirmar';
import { EstadoTabla } from '../../shared/ui/FilaMensaje';
import { Paginacion } from '../../shared/ui/Paginacion';
import { TokenUnicoModal } from '../../shared/ui/TokenUnicoModal';
import { toasts } from '../../shared/ui/toast';
import { formatFecha } from '../../shared/utils/fecha.util';
import { EditarOrganizacionModal } from './EditarOrganizacionModal';
import { ModulosModal } from './ModulosModal';
import { OrganizacionFormModal } from './OrganizacionFormModal';
import { SuspenderModal } from './SuspenderModal';
import {
  ESTADOS_TENANT,
  ESTADO_TENANT_AYUDA,
  ESTADO_TENANT_LABEL,
  ORDEN_TENANTS,
  puedeDarDeBaja,
  puedeEditar,
  puedeReactivar,
  puedeReenviarActivacion,
  puedeSuspender,
  tonoTenant,
} from './plataforma.labels';

const COLUMNAS = 6;

/** Clave de caché del portal. No lleva tenant: estos datos son cross-tenant. */
const CLAVE = ['plataforma', 'tenants'];

/**
 * Consola de organizaciones (FLUJO-PLATAFORMA).
 *
 * Todo lo consecuente pasa por confirmación con su consecuencia escrita:
 * suspender y dar de baja cierran **todas** las sesiones del tenant al
 * instante, y reenviar la activación **invalida el enlace anterior**.
 *
 * Qué acciones ofrece cada estado vive en `plataforma.labels.js`, no repartido
 * por la tabla: el backend las revalida con 422 y esto solo evita ofrecer un
 * botón que se sabe que va a fallar.
 */
export function OrganizacionesPage() {
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [orden, setOrden] = useState('created_at');

  const [alta, setAlta] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enModulos, setEnModulos] = useState(/** @type {object | null} */ (null));
  const [enSuspension, setEnSuspension] = useState(/** @type {object | null} */ (null));
  const [enReactivacion, setEnReactivacion] = useState(/** @type {object | null} */ (null));
  const [enReenvio, setEnReenvio] = useState(/** @type {object | null} */ (null));
  const [tokenEmitido, setTokenEmitido] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    search: busqueda,
    estado: estado || undefined,
    orden,
    desc: orden === 'created_at' ? true : undefined,
  };

  const consulta = useQuery({
    queryKey: [...CLAVE, filtros],
    queryFn: () => plataformaApi.listarTenants(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: CLAVE });
  }

  /** Detalle del tenant en edición de módulos: la lista no trae los activos. */
  const detalle = useQuery({
    queryKey: [...CLAVE, 'detalle', enModulos?.id],
    enabled: enModulos !== null,
    queryFn: () => plataformaApi.detalleTenant(enModulos.id),
  });

  const creacion = useMutation({
    mutationFn: (datos) => plataformaApi.crearTenant(datos),
    onSuccess: (creado) => {
      refrescar();
      setAlta(false);
      // El token llega **una sola vez**: se enseña en su modal, no en un toast.
      setTokenEmitido({
        titulo: 'Organización creada',
        mensaje:
          'Su administrador inicial debe fijar la contraseña con este código antes de que nadie pueda entrar.',
        destinatario: creado.admin_inicial.correo,
        token: creado.activacion_token,
      });
    },
  });

  const edicion = useMutation({
    mutationFn: ({ id, datos }) => plataformaApi.editarTenant(id, datos),
    onSuccess: () => {
      toasts.exito('Organización actualizada.');
      refrescar();
      setEnEdicion(null);
      setEnModulos(null);
    },
  });

  const suspension = useMutation({
    mutationFn: ({ id, datos, baja }) => plataformaApi.suspenderTenant(id, datos, baja),
    onSuccess: (resultado) => {
      toasts.exito(
        resultado.sesiones_revocadas === 1
          ? 'Hecho. Se cerró 1 sesión.'
          : `Hecho. Se cerraron ${resultado.sesiones_revocadas} sesiones.`,
      );
      refrescar();
      setEnSuspension(null);
    },
  });

  const reactivacion = useMutation({
    mutationFn: (org) => plataformaApi.reactivarTenant(org.id),
    onSuccess: (tenant) => {
      toasts.exito(`${tenant.razon_social} vuelve a estar activa.`);
      refrescar();
      setEnReactivacion(null);
    },
  });

  const reenvio = useMutation({
    mutationFn: (org) => plataformaApi.reenviarActivacion(org.id),
    onSuccess: (resultado) => {
      refrescar();
      setEnReenvio(null);
      setTokenEmitido({
        titulo: 'Enlace de activación reemitido',
        mensaje: `El anterior quedó invalidado. Este vence el ${formatFecha(resultado.expira_en)}.`,
        destinatario: resultado.admin_inicial.correo,
        token: resultado.activacion_token,
      });
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Organizaciones</h1>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Alta, plan, módulos y estado de cada entorno de la plataforma.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primario"
          onClick={() => {
            creacion.reset();
            setAlta(true);
          }}
        >
          <Plus size={18} />
          Nueva organización
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Buscador
          marcador="Buscar por razón social, dominio o id…"
          onBuscar={(texto) => {
            setBusqueda(texto);
            setPagina(1);
          }}
        />

        <select
          aria-label="Filtrar por estado"
          className="campo-control sm:w-52"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas</option>
          {ESTADOS_TENANT.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Ordenar por"
          className="campo-control sm:w-52"
          value={orden}
          onChange={(e) => {
            setOrden(e.target.value);
            setPagina(1);
          }}
        >
          {ORDEN_TENANTS.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              Ordenar por {opcion.label.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Organización</th>
              <th>Identificador</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Alta</th>
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
              mensajeVacio="No hay organizaciones con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((org) => (
                  <tr key={org.id}>
                    <td className="font-medium">
                      {org.razon_social}
                      <p className="text-label-md text-on-surface-variant">
                        {org.dominio_comercial}
                      </p>
                    </td>
                    <td className="clave tenue">{org.slug}</td>
                    <td className="tenue">{org.plan?.nombre ?? '—'}</td>
                    <td>
                      <Badge tono={tonoTenant(org.estado)}>{ESTADO_TENANT_LABEL[org.estado]}</Badge>
                      <p className="mt-0.5 max-w-[26ch] text-label-md text-on-surface-variant">
                        {ESTADO_TENANT_AYUDA[org.estado]}
                      </p>
                    </td>
                    <td className="tenue">{formatFecha(org.created_at)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {puedeEditar(org.estado) ? (
                          <>
                            <button
                              type="button"
                              className="btn-fila"
                              onClick={() => {
                                edicion.reset();
                                setEnEdicion(org);
                              }}
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-fila"
                              onClick={() => {
                                edicion.reset();
                                setEnModulos(org);
                              }}
                            >
                              <Blocks size={14} />
                              Módulos
                            </button>
                          </>
                        ) : null}

                        {puedeReenviarActivacion(org.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              reenvio.reset();
                              setEnReenvio(org);
                            }}
                          >
                            <Send size={14} />
                            Reenviar enlace
                          </button>
                        ) : null}

                        {puedeSuspender(org.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              suspension.reset();
                              setEnSuspension({ org, baja: false });
                            }}
                          >
                            <Ban size={14} />
                            Suspender
                          </button>
                        ) : null}

                        {puedeDarDeBaja(org.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              suspension.reset();
                              setEnSuspension({ org, baja: true });
                            }}
                          >
                            <Ban size={14} />
                            Dar de baja
                          </button>
                        ) : null}

                        {puedeReactivar(org.estado) ? (
                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => {
                              reactivacion.reset();
                              setEnReactivacion(org);
                            }}
                          >
                            <RotateCcw size={14} />
                            Reactivar
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

      {alta ? (
        <OrganizacionFormModal
          enviando={creacion.isPending}
          error={creacion.error}
          onGuardar={(datos) => creacion.mutate(datos)}
          onCerrar={() => setAlta(false)}
        />
      ) : null}

      {enEdicion ? (
        <EditarOrganizacionModal
          organizacion={enEdicion}
          enviando={edicion.isPending}
          error={edicion.error}
          onGuardar={(datos) => edicion.mutate({ id: enEdicion.id, datos })}
          onCerrar={() => setEnEdicion(null)}
        />
      ) : null}

      {enModulos && detalle.data ? (
        <ModulosModal
          organizacion={enModulos}
          activos={detalle.data.modulos_activos}
          enviando={edicion.isPending}
          error={edicion.error}
          onGuardar={(datos) => edicion.mutate({ id: enModulos.id, datos })}
          onCerrar={() => setEnModulos(null)}
        />
      ) : null}

      {enSuspension ? (
        <SuspenderModal
          organizacion={enSuspension.org}
          baja={enSuspension.baja}
          enviando={suspension.isPending}
          error={suspension.error}
          onConfirmar={(datos) =>
            suspension.mutate({ id: enSuspension.org.id, datos, baja: enSuspension.baja })
          }
          onCerrar={() => setEnSuspension(null)}
        />
      ) : null}

      {enReactivacion ? (
        <Confirmar
          titulo={`Reactivar ${enReactivacion.razon_social}`}
          mensaje="Sus usuarios volverán a poder iniciar sesión."
          detalle="Los datos se conservaron íntegros durante la suspensión."
          etiquetaConfirmar="Reactivar"
          enviando={reactivacion.isPending}
          error={reactivacion.error ? mensajeDeError(reactivacion.error) : ''}
          onConfirmar={() => reactivacion.mutate(enReactivacion)}
          onCancelar={() => setEnReactivacion(null)}
        />
      ) : null}

      {enReenvio ? (
        <Confirmar
          titulo={`Reenviar activación de ${enReenvio.razon_social}`}
          mensaje="Se generará un código nuevo y el anterior dejará de funcionar."
          detalle="Es la única vía de rescate si el enlace original venció: la activación no pasa por el login."
          etiquetaConfirmar="Generar código nuevo"
          enviando={reenvio.isPending}
          error={reenvio.error ? mensajeDeError(reenvio.error) : ''}
          onConfirmar={() => reenvio.mutate(enReenvio)}
          onCancelar={() => setEnReenvio(null)}
        />
      ) : null}

      {tokenEmitido ? (
        <TokenUnicoModal {...tokenEmitido} onCerrar={() => setTokenEmitido(null)} />
      ) : null}
    </div>
  );
}
