import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type Rol, type RolCreate } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { BuscadorComponent } from '../../../shared/ui/buscador/buscador.component';
import { ConfirmarModal } from '../../../shared/ui/confirmar/confirmar.modal';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { RolFormModal } from './rol-form.modal';

/**
 * Roles del tenant (FLUJO-USUARIOS §6).
 *
 * La baja tiene dos pasos por diseño del backend: si el rol tiene usuarios
 * asignados, el primer intento se rechaza con 422 y hay que repetirlo con
 * `?desactivar=true`. No es un capricho — desactivar un rol en uso deja a esas
 * personas sin los permisos que les daba, y el 422 trae **cuántas son** para
 * que quien decide lo sepa antes de insistir.
 *
 * Un rol de sistema no se desactiva nunca (403), así que ni se ofrece.
 */
@Component({
  selector: 'app-roles-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BuscadorComponent,
    ConfirmarModal,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
    RolFormModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Roles</h2>
          <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Un rol agrupa permisos. Cambiarlos afecta de inmediato a quien lo tenga asignado.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo rol
        </button>
      </div>

      <div class="flex flex-wrap gap-3">
        <app-buscador marcador="Buscar por nombre…" (buscar)="buscar($event)" />

        <label
          class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 text-body-sm"
        >
          <input type="checkbox" [checked]="verInactivos()" (change)="alternarInactivos($event)" />
          Ver roles dados de baja
        </label>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Tipo</th>
              <th class="num">Usuarios</th>
              <th class="num">Permisos</th>
              <th>Estado</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="6">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="6" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (rol of consulta.data()?.results ?? []; track rol.id) {
                <tr>
                  <td class="font-medium">{{ rol.nombre }}</td>
                  <td>
                    @if (rol.es_sistema) {
                      <app-badge tono="info">Sistema</app-badge>
                    } @else {
                      <span class="tenue text-label-md">Personalizado</span>
                    }
                  </td>
                  <td class="num tenue">{{ rol.usuarios_asignados }}</td>
                  <td class="num tenue">
                    {{ rol.acceso_total ? 'Todos' : contarPermisos(rol) }}
                  </td>
                  <td>
                    <app-badge [tono]="rol.activo ? 'exito' : 'neutro'">
                      {{ rol.activo ? 'Activo' : 'Dado de baja' }}
                    </app-badge>
                  </td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      @if (!rol.es_sistema) {
                        <button type="button" class="btn-fila" (click)="abrirEdicion(rol)">
                          Editar
                        </button>
                        @if (rol.activo) {
                          <button type="button" class="btn-fila" (click)="pedirBaja(rol)">
                            Desactivar
                          </button>
                        }
                      } @else {
                        <span class="tenue text-label-md">Sin acciones</span>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  No hay roles que coincidan con el filtro.
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
      <app-rol-form-modal
        [rol]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }

    @if (enBaja(); as rol) {
      <app-confirmar-modal
        titulo="Desactivar rol"
        [mensaje]="mensajeBaja(rol)"
        [detalle]="detalleBaja(rol)"
        [etiquetaConfirmar]="forzar() ? 'Desactivar de todos modos' : 'Desactivar'"
        [peligroso]="true"
        [enviando]="baja.isPending()"
        [error]="errorBaja()"
        (confirmar)="baja.mutate(rol)"
        (cancelar)="cancelarBaja()"
      />
    }
  `,
})
export class RolesPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly verInactivos = signal(false);

  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Rol | null>(null);
  protected readonly enBaja = signal<Rol | null>(null);

  /** Se activa cuando el backend pidió confirmación explícita por usuarios asignados. */
  protected readonly forzar = signal(false);
  private readonly asignados = signal<number | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
      // Sin el filtro salen todos; `false` acota a los dados de baja.
      activo: this.verInactivos() ? undefined : true,
    };

    return {
      queryKey: qk.lista(slug, 'roles', filtros),
      queryFn: () => this.api.listarRoles(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: RolCreate) => {
      const existente = this.enEdicion();
      return existente ? this.api.editarRol(existente.id, datos) : this.api.crearRol(datos);
    },
    onSuccess: (rol) => {
      this.toasts.exito(
        this.enEdicion() ? `Rol ${rol.nombre} actualizado.` : `Rol ${rol.nombre} creado.`,
      );
      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly baja = injectMutation(() => ({
    mutationFn: (rol: Rol) => this.api.desactivarRol(rol.id, this.forzar()),
    onSuccess: () => {
      this.toasts.exito('Rol desactivado.');
      this.refrescar();
      this.cancelarBaja();
    },
    /**
     * El 422 con `usuarios_asignados` no es un fallo: es el backend pidiendo
     * confirmación. Se guarda el número, se arma el aviso escalado y el
     * siguiente intento va con `?desactivar=true`.
     */
    onError: (error: unknown) => {
      if (isApiError(error) && typeof error.extra['usuarios_asignados'] === 'number') {
        this.asignados.set(error.extra['usuarios_asignados']);
        this.forzar.set(true);
      }
    },
  }));

  protected contarPermisos(rol: Rol): number {
    return rol.permisos.reduce((suma, grupo) => suma + grupo.permisos.length, 0);
  }

  protected mensajeBaja(rol: Rol): string {
    const cuantos = this.asignados();
    if (cuantos === null) {
      return `El rol «${rol.nombre}» dejará de estar disponible para asignar.`;
    }
    return cuantos === 1
      ? 'Hay 1 usuario con este rol. Al desactivarlo perderá los permisos que le daba.'
      : `Hay ${cuantos} usuarios con este rol. Al desactivarlo perderán los permisos que les daba.`;
  }

  protected detalleBaja(rol: Rol): string {
    return this.forzar()
      ? 'El cambio se aplica de inmediato, sin esperar a que vuelvan a entrar.'
      : `${this.contarPermisos(rol)} permisos · ${rol.usuarios_asignados} usuarios asignados`;
  }

  /** Solo se muestra el error si no es la petición de confirmación. */
  protected errorBaja(): string {
    const error = this.baja.error();
    if (!error) return '';
    if (isApiError(error) && typeof error.extra['usuarios_asignados'] === 'number') return '';
    return mensajeDeError(error);
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los roles.');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected alternarInactivos(evento: Event): void {
    this.verInactivos.set((evento.target as HTMLInputElement).checked);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(rol: Rol): void {
    this.enEdicion.set(rol);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: RolCreate): void {
    this.guardado.mutate(datos);
  }

  protected pedirBaja(rol: Rol): void {
    this.baja.reset();
    this.forzar.set(false);
    this.asignados.set(null);
    this.enBaja.set(rol);
  }

  protected cancelarBaja(): void {
    this.enBaja.set(null);
    this.forzar.set(false);
    this.asignados.set(null);
  }

  /**
   * Cambiar permisos altera lo que `/me` devuelve a los afectados. Se invalida
   * también el catálogo de permisos por si el rol tocó módulos.
   */
  private refrescar(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'roles') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'usuarios') });
  }
}
