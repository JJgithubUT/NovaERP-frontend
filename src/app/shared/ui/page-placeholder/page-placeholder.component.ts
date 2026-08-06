import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Andamio de una pantalla todavía sin construir.
 *
 * Existe para que el esqueleto se pueda navegar entero —rutas, guards, sidebar,
 * lazy loading— antes de que haya una sola tabla real. Cada página que lo use
 * debe reemplazarlo por su contenido, no envolverlo.
 */
@Component({
  selector: 'app-page-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section>
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-display-lg text-primary">{{ titulo() }}</h1>
          <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">{{ descripcion() }}</p>
        </div>

        <button
          type="button"
          disabled
          class="gradient-guinda flex cursor-not-allowed items-center gap-2 rounded px-4 py-2 text-label-md font-semibold opacity-40"
        >
          <app-icon name="add" [size]="18" />
          {{ accion() }}
        </button>
      </header>

      <div
        class="grid place-items-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center"
      >
        <app-icon name="table_chart" [size]="32" class="text-on-surface-variant" />
        <p class="mt-3 text-body-md text-on-surface-variant">Tabla pendiente de implementar.</p>

        @if (endpoint()) {
          <p class="mt-3 max-w-full overflow-x-auto font-mono text-mono-sm text-on-surface-variant">
            {{ endpoint() }}
          </p>
        }

        <p
          class="mt-5 inline-block rounded-full bg-warning-container px-2 py-0.5 text-label-caps uppercase text-on-warning-container"
        >
          Pendiente
        </p>
      </div>
    </section>
  `,
})
export class PagePlaceholderComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  /** Endpoint del openapi.yaml que alimentará esta pantalla. */
  readonly endpoint = input('');
  readonly accion = input('Nuevo');
}
