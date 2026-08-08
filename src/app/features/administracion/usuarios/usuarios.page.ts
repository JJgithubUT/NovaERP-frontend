import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type RevocacionResponse,
  type RolesDeUsuario,
  type Usuario,
  type UsuarioActualizado,
  type UsuarioCreado,
  type UsuarioCreate,
  type UsuarioEstado,
  type Uuid,
} from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { BuscadorComponent } from '../../../shared/ui/buscador/buscador.component';
import { ConfirmarModal } from '../../../shared/ui/confirmar/confirmar.modal';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import {
  ESTADO_USUARIO_AYUDA,
  ESTADO_USUARIO_LABEL,
  puedeReactivar,
  puedeSuspender,
  tonoUsuario,
} from '../administracion.labels';
import { RolesUsuarioModal } from './roles-usuario.modal';
import { TokenActivacionModal } from './token-activacion.modal';
import { UsuarioFormModal } from './usuario-form.modal';

/** Acción sensible pendiente de confirmar. */
type AccionCritica = 'suspender' | 'reset-mfa' | 'cerrar-sesiones';

/**
 * Directorio de usuarios del tenant (FLUJO-USUARIOS §4).
 *
 * Tres de las acciones de esta pantalla **echan a alguien del sistema en el
 * acto**: suspender, cerrar sus sesiones y resetear su segundo factor invalidan
 * su token en la siguiente petición. Todas pasan por confirmación explícita que
 * dice qué le ocurre a la persona afectada.
 *
 * Sobre uno mismo no se ofrecen: suspenderse o cerrarse las sesiones desde aquí
 * sería expulsarse sin querer, y para salir ya está el botón del menú. El
 * backend además protege al último administrador activo con un 422, que se
 * muestra tal cual porque el cliente no puede saber de antemano quién es.
 */
@Component({
  selector: 'app-usuarios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BuscadorComponent,
    ConfirmarModal,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
    RolesUsuarioModal,
    TokenActivacionModal,
    UsuarioFormModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Directorio de usuarios</h2>
          <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Solo quien está activo puede iniciar sesión. El segundo factor se configura en el primer
            acceso.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo usuario
        </button>
      </div>

      <div class="flex flex-wrap gap-3">
        <app-buscador marcador="Buscar por nombre, correo o puesto…" (buscar)="buscar($event)" />

        <select
          class="campo-control sm:w-60"
          aria-label="Filtrar por estado"
          [value]="estado()"
          (change)="filtrarEstado($event)"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pendiente">Pendientes de activar</option>
          <option value="suspendido">Suspendidos</option>
          <option value="pendiente_verificacion">Pendientes de verificar correo</option>
        </select>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Puesto</th>
              <th>Roles</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="7">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="7" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (usuario of consulta.data()?.results ?? []; track usuario.id) {
                <tr>
                  <td class="font-medium">
                    {{ usuario.nombre_completo }}
                    @if (esYo(usuario)) {
                      <span class="tenue ml-1 text-label-md">· tú</span>
                    }
                  </td>
                  <td class="clave tenue">{{ usuario.correo }}</td>
                  <td class="tenue">{{ usuario.puesto || '—' }}</td>
                  <td class="tenue">{{ usuario.roles.join(', ') || '—' }}</td>
                  <td>
                    <app-badge [tono]="tono(usuario.estado)" [attr.title]="ayuda(usuario.estado)">
                      {{ etiquetaEstado(usuario.estado) }}
                    </app-badge>
                  </td>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ usuario.ultimo_acceso ? fechaHora(usuario.ultimo_acceso) : 'Nunca' }}
                  </td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      <button type="button" class="btn-fila" (click)="abrirEdicion(usuario)">
                        Editar
                      </button>

                      <button type="button" class="btn-fila" (click)="abrirRoles(usuario)">
                        Roles
                      </button>

                      @if (puedeReactivarlo(usuario.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="reactivacion.isPending()"
                          (click)="reactivar(usuario)"
                        >
                          Reactivar
                        </button>
                      }

                      @if (!esYo(usuario)) {
                        @if (puedeSuspenderlo(usuario.estado)) {
                          <button
                            type="button"
                            class="btn-fila"
                            (click)="pedirConfirmacion(usuario, 'suspender')"
                          >
                            Suspender
                          </button>
                        }
                        <button
                          type="button"
                          class="btn-fila"
                          (click)="pedirConfirmacion(usuario, 'reset-mfa')"
                        >
                          Resetear MFA
                        </button>
                        <button
                          type="button"
                          class="btn-fila"
                          (click)="pedirConfirmacion(usuario, 'cerrar-sesiones')"
                        >
                          Cerrar sesiones
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  No hay usuarios que coincidan con el filtro.
                </tr>
              }
            }
          </tbody>
        </table>

        <app-paginacion
          [page]="pagina()"
          [count]="consulta.data()?.count ?? 0"
          [numPages]="consulta.data()?.num_pages ?? 1"
          (pageChange)="pagina.set($event)"
        />
      </div>
    </div>

    @if (modalAbierto()) {
      <app-usuario-form-modal
        [usuario]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }

    @if (confirmacion(); as pendiente) {
      <app-confirmar-modal
        [titulo]="textoConfirmacion(pendiente.accion).titulo"
        [mensaje]="textoConfirmacion(pendiente.accion).mensaje"
        [detalle]="pendiente.usuario.nombre_completo + ' · ' + pendiente.usuario.correo"
        [etiquetaConfirmar]="textoConfirmacion(pendiente.accion).boton"
        [peligroso]="true"
        [enviando]="critica.isPending()"
        [error]="errorCritica()"
        (confirmar)="ejecutar(pendiente)"
        (cancelar)="confirmacion.set(null)"
      />
    }

    @if (enRoles(); as usuario) {
      <app-roles-usuario-modal
        [usuario]="usuario"
        [rolesActuales]="rolesFrescos()"
        [asignando]="asignacion.isPending()"
        [revocando]="revocandoId()"
        [error]="errorRoles()"
        (asignar)="asignarRoles($event)"
        (revocar)="revocarRol($event)"
        (cerrar)="cerrarRoles()"
      />
    }

    @if (tokenEmitido(); as emitido) {
      <app-token-activacion-modal
        [titulo]="emitido.titulo"
        [mensaje]="emitido.mensaje"
        [destinatario]="emitido.destinatario"
        [token]="emitido.token"
        (cerrar)="tokenEmitido.set(null)"
      />
    }
  `,
})
export class UsuariosPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly estado = signal<UsuarioEstado | ''>('');

  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Usuario | null>(null);
  protected readonly confirmacion = signal<{ usuario: Usuario; accion: AccionCritica } | null>(
    null,
  );
  protected readonly tokenEmitido = signal<{
    titulo: string;
    mensaje: string;
    destinatario: string;
    token: string;
  } | null>(null);

  protected readonly enRoles = signal<Usuario | null>(null);
  /**
   * Roles del usuario según la última mutación. Es más fiable que la fila de la
   * tabla, que solo se refresca cuando vuelve el listado, y evita que el
   * diálogo se quede un instante mostrando el conjunto anterior.
   */
  protected readonly rolesFrescos = signal<RolesDeUsuario['roles'] | null>(null);
  protected readonly revocandoId = signal<Uuid | null>(null);

  private readonly miId = computed(() => this.store.usuarioId());

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
      estado: this.estado() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'usuarios', filtros),
      queryFn: () => this.api.listarUsuarios(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: UsuarioCreate) => {
      const existente = this.enEdicion();
      // Al editar no se mandan roles: eso es otro endpoint con su permiso.
      return existente
        ? this.api.editarUsuario(existente.id, {
            nombre_completo: datos.nombre_completo,
            correo: datos.correo,
            telefono: datos.telefono,
            puesto: datos.puesto,
            departamento: datos.departamento,
          })
        : this.api.crearUsuario(datos);
    },
    onSuccess: (usuario: UsuarioCreado & UsuarioActualizado) => {
      const creando = this.enEdicion() === null;

      // Cuál de los dos tokens llega depende de la rama: el alta emite el de
      // activación, y editar el correo el de verificación. Ninguno se puede
      // volver a consultar, así que si viene alguno hay que enseñarlo.
      if (creando && usuario.activacion_token) {
        this.tokenEmitido.set({
          titulo: 'Usuario creado',
          mensaje: 'Debe fijar su contraseña con este código antes de poder entrar.',
          destinatario: usuario.correo,
          token: usuario.activacion_token,
        });
      } else if (usuario.verificacion_token) {
        this.tokenEmitido.set({
          titulo: 'Correo cambiado',
          mensaje: 'El usuario no podrá entrar hasta reconfirmar su correo nuevo con este código.',
          destinatario: usuario.correo,
          token: usuario.verificacion_token,
        });
      } else {
        this.toasts.exito(creando ? 'Usuario creado.' : 'Usuario actualizado.');
      }

      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly reactivacion = injectMutation(() => ({
    mutationFn: (usuario: Usuario) => this.api.reactivarUsuario(usuario.id),
    onSuccess: (usuario) => {
      this.toasts.exito(`${usuario.nombre_completo} puede volver a entrar.`);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly critica = injectMutation(() => ({
    mutationFn: ({
      usuario,
      accion,
    }: {
      usuario: Usuario;
      accion: AccionCritica;
    }): Promise<Usuario | RevocacionResponse> => {
      switch (accion) {
        case 'suspender':
          return this.api.suspenderUsuario(usuario.id);
        case 'reset-mfa':
          return this.api.resetearMfa(usuario.id);
        case 'cerrar-sesiones':
          return this.api.cerrarSesionesDe(usuario.id);
      }
    },
    onSuccess: (_resultado, variables) => {
      this.toasts.exito(this.mensajeExito(variables.accion, variables.usuario));
      this.refrescar();
      this.confirmacion.set(null);
    },
  }));

  protected readonly asignacion = injectMutation(() => ({
    mutationFn: ({ id, roles }: { id: Uuid; roles: Uuid[] }) => this.api.asignarRoles(id, roles),
    onSuccess: (resultado: RolesDeUsuario) => {
      this.rolesFrescos.set(resultado.roles);
      this.toasts.exito('Roles asignados.');
      this.refrescar();
    },
  }));

  protected readonly revocacion = injectMutation(() => ({
    mutationFn: ({ id, rolId }: { id: Uuid; rolId: Uuid }) => this.api.revocarRol(id, rolId),
    onSuccess: (resultado: RolesDeUsuario) => {
      this.rolesFrescos.set(resultado.roles);
      this.toasts.exito('Rol revocado.');
      this.refrescar();
    },
    // Se limpia pase lo que pase: si no, un 422 dejaría la fila en «Revocando…».
    onSettled: () => this.revocandoId.set(null),
  }));

  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoUsuario;
  protected readonly puedeSuspenderlo = puedeSuspender;
  protected readonly puedeReactivarlo = puedeReactivar;

  protected etiquetaEstado(estado: UsuarioEstado): string {
    return ESTADO_USUARIO_LABEL[estado];
  }

  protected ayuda(estado: UsuarioEstado): string {
    return ESTADO_USUARIO_AYUDA[estado];
  }

  /** Las acciones que expulsan no se ofrecen sobre uno mismo. */
  protected esYo(usuario: Usuario): boolean {
    return usuario.id === this.miId();
  }

  protected textoConfirmacion(accion: AccionCritica): {
    titulo: string;
    mensaje: string;
    boton: string;
  } {
    switch (accion) {
      case 'suspender':
        return {
          titulo: 'Suspender usuario',
          mensaje:
            'Se cerrarán todas sus sesiones y no podrá iniciar sesión hasta que lo reactives.',
          boton: 'Suspender',
        };
      case 'reset-mfa':
        return {
          titulo: 'Resetear segundo factor',
          mensaje:
            'Tendrá que volver a configurar su aplicación de autenticación en su próximo inicio de sesión.',
          boton: 'Resetear MFA',
        };
      case 'cerrar-sesiones':
        return {
          titulo: 'Cerrar sesiones del usuario',
          mensaje: 'Se cerrarán todas sus sesiones abiertas y tendrá que volver a entrar.',
          boton: 'Cerrar sesiones',
        };
    }
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el directorio.');
  }

  protected errorCritica(): string {
    const error = this.critica.error();
    return error ? mensajeDeError(error) : '';
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as UsuarioEstado | '');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(usuario: Usuario): void {
    this.enEdicion.set(usuario);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: UsuarioCreate): void {
    this.guardado.mutate(datos);
  }

  protected reactivar(usuario: Usuario): void {
    this.reactivacion.mutate(usuario);
  }

  protected abrirRoles(usuario: Usuario): void {
    this.asignacion.reset();
    this.revocacion.reset();
    this.rolesFrescos.set(null);
    this.revocandoId.set(null);
    this.enRoles.set(usuario);
  }

  protected cerrarRoles(): void {
    this.enRoles.set(null);
    this.rolesFrescos.set(null);
  }

  protected asignarRoles(roles: Uuid[]): void {
    const usuario = this.enRoles();
    if (!usuario) return;

    this.revocacion.reset();
    this.asignacion.mutate({ id: usuario.id, roles });
  }

  protected revocarRol(rol: { id: Uuid }): void {
    const usuario = this.enRoles();
    if (!usuario) return;

    this.asignacion.reset();
    this.revocandoId.set(rol.id);
    this.revocacion.mutate({ id: usuario.id, rolId: rol.id });
  }

  /** El error de la última de las dos operaciones que se haya intentado. */
  protected errorRoles(): unknown {
    return this.asignacion.error() ?? this.revocacion.error();
  }

  protected pedirConfirmacion(usuario: Usuario, accion: AccionCritica): void {
    this.critica.reset();
    this.confirmacion.set({ usuario, accion });
  }

  protected ejecutar(pendiente: { usuario: Usuario; accion: AccionCritica }): void {
    this.critica.mutate(pendiente);
  }

  private mensajeExito(accion: AccionCritica, usuario: Usuario): string {
    switch (accion) {
      case 'suspender':
        return `${usuario.nombre_completo} quedó suspendido.`;
      case 'reset-mfa':
        return `${usuario.nombre_completo} volverá a configurar su segundo factor.`;
      case 'cerrar-sesiones':
        return `Se cerraron las sesiones de ${usuario.nombre_completo}.`;
    }
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({
      queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'usuarios'),
    });
  }
}
