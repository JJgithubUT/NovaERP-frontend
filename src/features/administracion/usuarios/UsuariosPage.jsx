import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogOut, Pencil, Plus, ShieldCheck, ShieldX, UserCog } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as coreApi from '../../../api/services/core.api';
import { useAuth, useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Buscador } from '../../../shared/ui/Buscador';
import { Confirmar } from '../../../shared/ui/Confirmar';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import {
  ESTADO_USUARIO_AYUDA,
  ESTADO_USUARIO_LABEL,
  puedeReactivar,
  puedeSuspender,
  tonoUsuario,
} from '../administracion.labels';
import { RolesUsuarioModal } from './RolesUsuarioModal';
import { TokenUnicoModal } from '../../../shared/ui/TokenUnicoModal';
import { UsuarioFormModal } from './UsuarioFormModal';

const COLUMNAS = 6;

/** Textos de las tres acciones que expulsan o degradan acceso. */
const CONFIRMACIONES = {
  suspender: {
    titulo: 'Suspender usuario',
    mensaje: 'Se cerrarán todas sus sesiones y no podrá iniciar sesión hasta que lo reactives.',
    boton: 'Suspender',
  },
  'reset-mfa': {
    titulo: 'Resetear segundo factor',
    mensaje:
      'Tendrá que volver a configurar su aplicación de autenticación en su próximo inicio de sesión.',
    boton: 'Resetear MFA',
  },
  'cerrar-sesiones': {
    titulo: 'Cerrar sesiones del usuario',
    mensaje: 'Se cerrarán todas sus sesiones abiertas y tendrá que volver a entrar.',
    boton: 'Cerrar sesiones',
  },
};

/**
 * Directorio de usuarios del tenant (FLUJO-USUARIOS).
 *
 * Varias acciones de aquí **invalidan sesiones al instante**. Todas pasan por
 * una confirmación que dice qué le ocurre a la persona afectada, no un «¿estás
 * seguro?» genérico.
 *
 * Y ninguna de las tres se ofrece sobre uno mismo: suspenderse o cerrarse las
 * sesiones desde el directorio es echarse de la aplicación a mitad de la tarea.
 * Para eso está «Mi cuenta», donde la consecuencia es evidente.
 */
export function UsuariosPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const auth = useAuth();
  const miId = auth.usuarioId();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enRoles, setEnRoles] = useState(/** @type {object | null} */ (null));
  const [rolesFrescos, setRolesFrescos] = useState(/** @type {object[] | null} */ (null));
  const [revocandoId, setRevocandoId] = useState(/** @type {string | null} */ (null));
  const [confirmacion, setConfirmacion] = useState(/** @type {object | null} */ (null));
  const [tokenEmitido, setTokenEmitido] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    search: busqueda,
    estado: estado || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'usuarios', filtros),
    queryFn: () => coreApi.listarUsuarios(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'usuarios') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion ? coreApi.editarUsuario(enEdicion.id, datos) : coreApi.crearUsuario(datos),
    onSuccess: (usuario) => {
      /*
       * Los tokens llegan **una sola vez** en esta respuesta. Si hay uno, se
       * enseña en su propio modal en vez de un toast que se desvanece a los
       * cuatro segundos llevándose el único código que existe.
       */
      if (usuario.activacion_token) {
        setTokenEmitido({
          titulo: 'Usuario creado',
          mensaje: 'Debe fijar su contraseña con este código antes de poder entrar.',
          destinatario: usuario.correo,
          token: usuario.activacion_token,
        });
      } else if (usuario.verificacion_token) {
        setTokenEmitido({
          titulo: 'Correo cambiado',
          mensaje: 'El usuario no podrá entrar hasta reconfirmar su correo nuevo con este código.',
          destinatario: usuario.correo,
          token: usuario.verificacion_token,
        });
      } else {
        toasts.exito(enEdicion ? 'Usuario actualizado.' : 'Usuario creado.');
      }

      refrescar();
      cerrarModal();
    },
  });

  const reactivacion = useMutation({
    mutationFn: (usuario) => coreApi.reactivarUsuario(usuario.id),
    onSuccess: (usuario) => {
      toasts.exito(`${usuario.nombre_completo} puede volver a entrar.`);
      refrescar();
    },
    onError: (error) => toasts.error(mensajeDeError(error)),
  });

  const critica = useMutation({
    mutationFn: ({ usuario, accion }) => {
      switch (accion) {
        case 'suspender':
          return coreApi.suspenderUsuario(usuario.id);
        case 'reset-mfa':
          return coreApi.resetearMfa(usuario.id);
        default:
          return coreApi.cerrarSesionesDe(usuario.id);
      }
    },
    onSuccess: (_resultado, { usuario, accion }) => {
      const mensajes = {
        suspender: `${usuario.nombre_completo} quedó suspendido.`,
        'reset-mfa': `${usuario.nombre_completo} volverá a configurar su segundo factor.`,
        'cerrar-sesiones': `Se cerraron las sesiones de ${usuario.nombre_completo}.`,
      };
      toasts.exito(mensajes[accion]);
      refrescar();
      setConfirmacion(null);
    },
  });

  const asignacion = useMutation({
    mutationFn: ({ id, roles }) => coreApi.asignarRoles(id, roles),
    onSuccess: (resultado) => {
      setRolesFrescos(resultado.roles);
      toasts.exito('Roles asignados.');
      refrescar();
    },
  });

  const revocacion = useMutation({
    mutationFn: ({ id, rolId }) => coreApi.revocarRol(id, rolId),
    onSuccess: (resultado) => {
      setRolesFrescos(resultado.roles);
      toasts.exito('Rol revocado.');
      refrescar();
    },
    // Se limpia pase lo que pase: si no, un 422 dejaría la fila en «Revocando…».
    onSettled: () => setRevocandoId(null),
  });

  function abrir(usuario) {
    guardado.reset();
    setEnEdicion(usuario);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
  }

  function abrirRoles(usuario) {
    asignacion.reset();
    revocacion.reset();
    setRolesFrescos(null);
    setRevocandoId(null);
    setEnRoles(usuario);
  }

  function pedirConfirmacion(usuario, accion) {
    critica.reset();
    setConfirmacion({ usuario, accion });
  }

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Usuarios</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Solo se puede iniciar sesión en estado «Activo». Los demás estados dicen qué falta.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo usuario
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Buscador
          marcador="Buscar por nombre, correo o puesto…"
          onBuscar={(texto) => {
            setBusqueda(texto);
            setPagina(1);
          }}
        />

        <select
          aria-label="Filtrar por estado"
          className="campo-control sm:w-64"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_USUARIO_LABEL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Roles</th>
              <th>Estado</th>
              <th>Último acceso</th>
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
              mensajeVacio="No hay usuarios con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((usuario) => {
                  const esYo = usuario.id === miId;

                  return (
                    <tr key={usuario.id}>
                      <td className="font-medium">
                        {usuario.nombre_completo}
                        {esYo ? (
                          <span className="ml-2 text-label-md text-on-surface-variant">(tú)</span>
                        ) : null}
                        {usuario.puesto ? (
                          <p className="text-label-md text-on-surface-variant">{usuario.puesto}</p>
                        ) : null}
                      </td>
                      <td className="tenue">{usuario.correo}</td>
                      <td className="tenue">{usuario.roles.join(', ') || '—'}</td>
                      <td>
                        <Badge tono={tonoUsuario(usuario.estado)}>
                          {ESTADO_USUARIO_LABEL[usuario.estado]}
                        </Badge>
                        <p className="mt-0.5 max-w-[22ch] text-label-md text-on-surface-variant">
                          {ESTADO_USUARIO_AYUDA[usuario.estado]}
                        </p>
                      </td>
                      <td className="tenue">{formatFechaHora(usuario.ultimo_acceso)}</td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button type="button" className="btn-fila" onClick={() => abrir(usuario)}>
                            <Pencil size={14} />
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-fila"
                            onClick={() => abrirRoles(usuario)}
                          >
                            <UserCog size={14} />
                            Roles
                          </button>

                          {puedeReactivar(usuario.estado) ? (
                            <button
                              type="button"
                              className="btn-fila"
                              disabled={reactivacion.isPending}
                              onClick={() => reactivacion.mutate(usuario)}
                            >
                              <ShieldCheck size={14} />
                              Reactivar
                            </button>
                          ) : null}

                          {/* Las acciones que expulsan no se ofrecen sobre uno
                              mismo: ver la nota de cabecera. */}
                          {!esYo && puedeSuspender(usuario.estado) ? (
                            <button
                              type="button"
                              className="btn-fila"
                              onClick={() => pedirConfirmacion(usuario, 'suspender')}
                            >
                              <ShieldX size={14} />
                              Suspender
                            </button>
                          ) : null}

                          {!esYo ? (
                            <>
                              <button
                                type="button"
                                className="btn-fila"
                                onClick={() => pedirConfirmacion(usuario, 'reset-mfa')}
                              >
                                <KeyRound size={14} />
                                Reset MFA
                              </button>
                              <button
                                type="button"
                                className="btn-fila"
                                onClick={() => pedirConfirmacion(usuario, 'cerrar-sesiones')}
                              >
                                <LogOut size={14} />
                                Cerrar sesiones
                              </button>
                            </>
                          ) : null}
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
        <UsuarioFormModal
          usuario={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enRoles ? (
        <RolesUsuarioModal
          usuario={enRoles}
          rolesActuales={rolesFrescos}
          asignando={asignacion.isPending}
          revocandoId={revocandoId}
          error={asignacion.error ?? revocacion.error}
          onAsignar={(roles) => {
            revocacion.reset();
            asignacion.mutate({ id: enRoles.id, roles });
          }}
          onRevocar={(rol) => {
            asignacion.reset();
            setRevocandoId(rol.id);
            revocacion.mutate({ id: enRoles.id, rolId: rol.id });
          }}
          onCerrar={() => {
            setEnRoles(null);
            setRolesFrescos(null);
          }}
        />
      ) : null}

      {confirmacion ? (
        <Confirmar
          titulo={CONFIRMACIONES[confirmacion.accion].titulo}
          mensaje={CONFIRMACIONES[confirmacion.accion].mensaje}
          detalle={`Afecta a ${confirmacion.usuario.nombre_completo} (${confirmacion.usuario.correo}).`}
          etiquetaConfirmar={CONFIRMACIONES[confirmacion.accion].boton}
          peligroso
          enviando={critica.isPending}
          error={critica.error ? mensajeDeError(critica.error) : ''}
          onConfirmar={() => critica.mutate(confirmacion)}
          onCancelar={() => setConfirmacion(null)}
        />
      ) : null}

      {tokenEmitido ? (
        <TokenUnicoModal {...tokenEmitido} onCerrar={() => setTokenEmitido(null)} />
      ) : null}
    </div>
  );
}
