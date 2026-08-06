import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Barra de paginación de los listados.
 *
 * Se apoya en `num_pages` del sobre del backend en vez de recalcularlo con
 * `ceil(count / page_size)`: el backend recorta `page_size` al rango [1, 100]
 * en silencio, así que si la pantalla pide 500 el cálculo local daría un número
 * de páginas que no existe.
 */
@Component({
  selector: 'app-paginacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <nav
      class="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-4 py-2.5 text-label-md text-on-surface-variant"
      [attr.aria-label]="'Paginación'"
    >
      <span>
        {{ count() }} {{ count() === 1 ? 'registro' : 'registros' }} · página {{ page() }} de
        {{ totalPaginas() }}
      </span>

      <div class="flex gap-2">
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-outline-variant px-2.5 py-1 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="page() <= 1"
          (click)="pageChange.emit(page() - 1)"
        >
          <app-icon name="chevron_left" [size]="16" />
          Anterior
        </button>
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-outline-variant px-2.5 py-1 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="page() >= totalPaginas()"
          (click)="pageChange.emit(page() + 1)"
        >
          Siguiente
          <app-icon name="chevron_right" [size]="16" />
        </button>
      </div>
    </nav>
  `,
})
export class PaginacionComponent {
  readonly page = input.required<number>();
  readonly count = input(0);
  /** `num_pages` del sobre. Ver la nota de arriba sobre por qué no se calcula. */
  readonly numPages = input(1);

  readonly pageChange = output<number>();

  /** Una lista vacía sigue siendo "página 1 de 1", no "de 0". */
  protected readonly totalPaginas = computed(() => Math.max(1, this.numPages()));
}
