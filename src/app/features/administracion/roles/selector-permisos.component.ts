import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { DominioPermisos } from '../../../api/models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Selector del catálogo maestro de permisos, agrupado por dominio.
 *
 * El detalle que gobierna el diseño: los permisos de un módulo que el tenant no
 * tiene contratado llegan marcados como **inertes**, y el backend los devuelve
 * a propósito en vez de omitirlos (RF-11/CA02). Aquí se muestran deshabilitados
 * y con su explicación — ocultarlos dejaría al administrador buscando un
 * permiso que existe en la documentación y no aparece por ningún lado.
 *
 * Un permiso inerte no se puede marcar y tampoco autoriza nada aunque
 * estuviera guardado de antes.
 */
@Component({
  selector: 'app-selector-permisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-label-caps uppercase text-on-surface-variant">
          Permisos ({{ seleccionados().length }} de {{ totalSeleccionables() }})
        </h3>
        @if (hayInertes()) {
          <p class="text-label-md text-on-surface-variant">
            Los atenuados pertenecen a módulos que tu empresa no tiene activos.
          </p>
        }
      </div>

      <div class="flex flex-col gap-3">
        @for (grupo of dominios(); track grupo.dominio) {
          <section class="rounded border border-outline-variant">
            <header
              class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-3 py-2"
            >
              <h4 class="text-label-md font-semibold uppercase text-on-surface">
                {{ grupo.dominio }}
              </h4>

              @if (seleccionablesDe(grupo) > 0) {
                <button
                  type="button"
                  class="btn-fila"
                  (click)="alternarDominio(grupo, !todoMarcado(grupo))"
                >
                  {{ todoMarcado(grupo) ? 'Quitar todos' : 'Marcar todos' }}
                </button>
              }
            </header>

            <div class="grid gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
              @for (permiso of grupo.permisos; track permiso.codigo) {
                <label
                  class="flex items-start gap-2 text-body-sm"
                  [class.opacity-50]="permiso.inerte"
                  [attr.title]="permiso.inerte ? ayudaInerte : permiso.descripcion"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5"
                    [checked]="tiene(permiso.codigo)"
                    [disabled]="permiso.inerte"
                    (change)="alternar(permiso.codigo, $any($event.target).checked)"
                  />
                  <span class="min-w-0">
                    <span class="block font-mono text-mono-sm text-on-surface">
                      {{ permiso.codigo }}
                    </span>
                    @if (permiso.descripcion) {
                      <span class="block text-label-md text-on-surface-variant">
                        {{ permiso.descripcion }}
                      </span>
                    }
                    @if (permiso.inerte) {
                      <span
                        class="mt-0.5 inline-flex items-center gap-1 text-label-md text-on-surface-variant"
                      >
                        <app-icon name="warning" [size]="12" />
                        Módulo inactivo
                      </span>
                    }
                  </span>
                </label>
              }
            </div>
          </section>
        } @empty {
          <p class="text-body-sm text-on-surface-variant">No hay permisos en el catálogo.</p>
        }
      </div>
    </div>
  `,
})
export class SelectorPermisosComponent {
  readonly dominios = input.required<readonly DominioPermisos[]>();

  /** Códigos marcados. Los inertes nunca entran aquí. */
  readonly seleccionados = model.required<string[]>();

  protected readonly ayudaInerte =
    'Pertenece a un módulo que no está activo en tu empresa: no se puede asignar y no autorizaría nada.';

  protected readonly totalSeleccionables = computed(() =>
    this.dominios().reduce((suma, grupo) => suma + this.seleccionablesDe(grupo), 0),
  );

  protected readonly hayInertes = computed(() =>
    this.dominios().some((grupo) => grupo.permisos.some((permiso) => permiso.inerte)),
  );

  protected tiene(codigo: string): boolean {
    return this.seleccionados().includes(codigo);
  }

  protected seleccionablesDe(grupo: DominioPermisos): number {
    return grupo.permisos.filter((permiso) => !permiso.inerte).length;
  }

  protected todoMarcado(grupo: DominioPermisos): boolean {
    const elegibles = grupo.permisos.filter((permiso) => !permiso.inerte);
    return elegibles.length > 0 && elegibles.every((permiso) => this.tiene(permiso.codigo));
  }

  protected alternar(codigo: string, marcado: boolean): void {
    this.seleccionados.update((actual) =>
      marcado ? [...new Set([...actual, codigo])] : actual.filter((c) => c !== codigo),
    );
  }

  /** «Marcar todos» ignora los inertes: marcarlos sería prometer algo falso. */
  protected alternarDominio(grupo: DominioPermisos, marcar: boolean): void {
    const codigos = grupo.permisos
      .filter((permiso) => !permiso.inerte)
      .map((permiso) => permiso.codigo);

    this.seleccionados.update((actual) =>
      marcar
        ? [...new Set([...actual, ...codigos])]
        : actual.filter((codigo) => !codigos.includes(codigo)),
    );
  }
}
