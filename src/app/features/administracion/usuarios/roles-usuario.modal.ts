import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Rol, RolesDeUsuario, Usuario, Uuid } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Roles que se ofrecen sin obligar a paginar, igual que en el alta. */
const MAX_ROLES = 100;

/** Acciones que no mutan. El resto sí, y son las que chocan con el Auditor. */
const ACCIONES_LECTURA = new Set(['leer', 'exportar']);
const PERMISO_AUDITOR = 'core:bitacora:leer';

type RolAsignado = RolesDeUsuario['roles'][number];

/**
 * Asignar y revocar roles de un usuario (RF-14 / RF-15).
 *
 * El diálogo tiene dos mitades porque **la API tiene dos operaciones con formas
 * distintas**, y fingir una sola sería mentir sobre lo que ocurre:
 *
 * - `POST …/roles/` es **aditivo**: manda un lote de ids y solo añade los que
 *   faltaban. Nunca quita nada.
 * - `DELETE …/roles/{id}/` revoca **de uno en uno**, y cada revocación tiene sus
 *   propias reglas que pueden rechazarla por separado.
 *
 * Una lista de casillas «marcar/desmarcar y guardar» habría sugerido que
 * desmarcar revoca, cuando en realidad exigiría N peticiones que pueden fallar
 * a mitad y dejar el conjunto a medio aplicar. Por eso arriba se revoca fila a
 * fila y abajo se asigna en lote.
 *
 * Tres reglas del backend, y qué hace la pantalla con cada una:
 *
 * 1. **Nadie se queda sin roles.** Se puede saber aquí: con un solo rol, el
 *    botón de revocar sale deshabilitado y dice por qué.
 * 2. **No se revoca el rol de sistema al último administrador activo.** Esto
 *    *no* se puede saber aquí — hace falta contar administradores de todo el
 *    tenant. Llega como 422 y se muestra tal cual.
 * 3. **Segregación del Auditor:** quien lee la bitácora no puede tener además
 *    permisos de mutación. Sí se puede anticipar, porque el catálogo de roles
 *    trae los permisos de cada uno; se evalúa sobre el conjunto resultante
 *    (actuales + marcados) y bloquea el botón antes de gastar una petición.
 */
@Component({
  selector: 'app-roles-usuario-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal
      ancho="lg"
      [titulo]="'Roles de ' + usuario().nombre_completo"
      (cerrar)="cerrar.emit()"
    >
      @if (mensajeError(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      @if (catalogo.isPending()) {
        <p class="text-body-sm text-on-surface-variant">Cargando roles…</p>
      } @else if (catalogo.isError()) {
        <p class="text-body-sm text-error">No se pudieron cargar los roles.</p>
      } @else {
        <!-- ------------------------------------------------ roles actuales -->
        <div class="flex flex-col gap-2">
          <p class="text-label-caps uppercase text-on-surface-variant">Roles asignados</p>

          <ul
            class="flex flex-col divide-y divide-outline-variant rounded border border-outline-variant"
          >
            @for (rol of actuales(); track rol.id) {
              <li class="flex items-center justify-between gap-3 px-3 py-2">
                <span class="min-w-0 text-body-sm text-on-surface">
                  {{ rol.nombre }}
                  @if (rol.es_sistema) {
                    <span class="tenue text-label-md">· acceso total</span>
                  }
                  @if (!rol.activo) {
                    <span class="text-label-md text-warning">· rol desactivado</span>
                  }
                </span>

                <button
                  type="button"
                  class="btn-fila shrink-0"
                  [disabled]="!sePuedeRevocar() || revocando() !== null"
                  [attr.title]="sePuedeRevocar() ? null : razonNoRevocar"
                  (click)="revocar.emit(rol)"
                >
                  {{ revocando() === rol.id ? 'Revocando…' : 'Revocar' }}
                </button>
              </li>
            } @empty {
              <li class="px-3 py-2 text-body-sm text-on-surface-variant">
                Sin roles. El usuario no puede hacer nada hasta que le asignes uno.
              </li>
            }
          </ul>

          @if (!sePuedeRevocar() && actuales().length > 0) {
            <p class="text-label-md text-on-surface-variant">{{ razonNoRevocar }}</p>
          }
        </div>

        <!-- ------------------------------------------------ asignar nuevos -->
        <div class="flex flex-col gap-2">
          <p class="text-label-caps uppercase text-on-surface-variant">Asignar roles</p>

          @if (disponibles().length === 0) {
            <p class="text-body-sm text-on-surface-variant">
              No queda ningún rol activo por asignar.
            </p>
          } @else {
            <div class="flex flex-col gap-1.5 rounded border border-outline-variant p-3">
              @for (rol of disponibles(); track rol.id) {
                <label class="flex items-center gap-2 text-body-sm text-on-surface">
                  <input
                    type="checkbox"
                    [checked]="marcado(rol.id)"
                    (change)="alternar(rol.id, $any($event.target).checked)"
                  />
                  {{ rol.nombre }}
                  @if (rol.acceso_total) {
                    <span class="tenue text-label-md">· acceso total</span>
                  }
                </label>
              }
            </div>
          }

          @if (chocaConAuditor()) {
            <p
              class="rounded border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
              role="alert"
            >
              El rol Auditor es incompatible con permisos de creación, edición o eliminación. Esta
              combinación mezcla la lectura de bitácora con permisos que mutan datos.
            </p>
          }
        </div>
      }

      <div footer>
        <button type="button" class="btn btn-secundario" (click)="cerrar.emit()">Cerrar</button>
        <button
          type="button"
          class="btn btn-primario"
          [disabled]="!sePuedeAsignar()"
          (click)="asignar.emit(aAsignar())"
        >
          {{ asignando() ? 'Asignando…' : 'Asignar seleccionados' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class RolesUsuarioModal {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);

  readonly usuario = input.required<Usuario>();
  /**
   * Conjunto autoritativo devuelto por la última mutación. Mientras no haya
   * ninguna es `null` y los roles se resuelven por nombre contra el catálogo:
   * `Usuario.roles` trae nombres, no ids, y para revocar hace falta el id. Los
   * nombres son únicos dentro del tenant, así que la correspondencia es exacta.
   */
  readonly rolesActuales = input<RolesDeUsuario['roles'] | null>(null);
  readonly asignando = input(false);
  /** Id del rol que se está revocando, para marcar solo esa fila. */
  readonly revocando = input<Uuid | null>(null);
  readonly error = input<unknown>(null);

  readonly asignar = output<Uuid[]>();
  readonly revocar = output<RolAsignado>();
  readonly cerrar = output<void>();

  protected readonly seleccionados = signal<Uuid[]>([]);

  protected readonly razonNoRevocar = 'El usuario debe conservar al menos un rol.';

  /**
   * Todos los roles, no solo los activos: un rol desactivado conserva sus
   * asignaciones, así que puede aparecer entre los del usuario y hay que poder
   * revocarlo. Para *asignar* se filtran los activos más abajo.
   */
  protected readonly catalogo = injectQuery(() => {
    const filtros = { page_size: MAX_ROLES };
    return {
      queryKey: qk.lista(this.store.tenantSlug() ?? '', 'roles', filtros),
      queryFn: () => this.api.listarRoles(filtros).then((pagina) => pagina.results),
    };
  });

  private readonly porNombre = computed(() => {
    const mapa = new Map<string, Rol>();
    for (const rol of this.catalogo.data() ?? []) mapa.set(rol.nombre, rol);
    return mapa;
  });

  protected readonly actuales = computed<RolAsignado[]>(() => {
    const frescos = this.rolesActuales();
    if (frescos) return frescos;

    return this.usuario()
      .roles.map((nombre) => this.porNombre().get(nombre))
      .filter((rol): rol is Rol => rol !== undefined)
      .map(({ id, nombre, activo, es_sistema }) => ({ id, nombre, activo, es_sistema }));
  });

  protected readonly disponibles = computed(() => {
    const yaTiene = new Set(this.actuales().map((rol) => rol.id));
    return (this.catalogo.data() ?? []).filter((rol) => rol.activo && !yaTiene.has(rol.id));
  });

  /** RN01: con un solo rol, revocar dejaría al usuario sin ninguno. */
  protected readonly sePuedeRevocar = computed(() => this.actuales().length > 1);

  /**
   * Réplica de `_valida_segregacion_auditor`: se mide sobre los permisos
   * **explícitos** del conjunto resultante. Un rol de sistema no aporta códigos
   * (autoriza por bypass, sin filas en `rol_permiso`), así que no dispara la
   * incompatibilidad — que es justo lo que hace el backend.
   */
  protected readonly chocaConAuditor = computed(() => {
    const resultantes = new Set([...this.actuales().map((rol) => rol.id), ...this.seleccionados()]);

    const codigos = new Set<string>();
    for (const rol of this.catalogo.data() ?? []) {
      if (!resultantes.has(rol.id)) continue;
      for (const grupo of rol.permisos) {
        for (const permiso of grupo.permisos) codigos.add(permiso.codigo);
      }
    }

    if (!codigos.has(PERMISO_AUDITOR)) return false;
    return [...codigos].some((codigo) => !ACCIONES_LECTURA.has(codigo.split(':').at(-1) ?? ''));
  });

  /**
   * La selección acotada a lo que sigue estando disponible. Tras una asignación
   * con éxito los roles marcados pasan a la lista de arriba y desaparecen de
   * las casillas; sin este filtro seguirían contando y el botón quedaría activo
   * ofreciendo reasignar algo que el usuario ya tiene.
   */
  protected readonly aAsignar = computed(() => {
    const disponibles = new Set(this.disponibles().map((rol) => rol.id));
    return this.seleccionados().filter((id) => disponibles.has(id));
  });

  protected readonly sePuedeAsignar = computed(
    () => this.aAsignar().length > 0 && !this.asignando() && !this.chocaConAuditor(),
  );

  protected readonly mensajeError = computed(() => {
    const error = this.error();
    return error ? mensajeDeError(error) : null;
  });

  protected marcado(id: Uuid): boolean {
    return this.seleccionados().includes(id);
  }

  protected alternar(id: Uuid, marcado: boolean): void {
    this.seleccionados.update((actual) =>
      marcado ? [...actual, id] : actual.filter((rolId) => rolId !== id),
    );
  }
}
