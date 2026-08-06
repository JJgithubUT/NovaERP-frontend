import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

interface Pestana {
  readonly segmento: string;
  readonly label: string;
}

/** RV-01..06, en el orden en que los numera el backend. */
const PESTANAS: readonly Pestana[] = [
  { segmento: 'periodo', label: 'Por periodo' },
  { segmento: 'clientes', label: 'Clientes' },
  { segmento: 'productos', label: 'Productos' },
  { segmento: 'embudo', label: 'Embudo' },
  { segmento: 'cartera', label: 'Cartera' },
  { segmento: 'vendedores', label: 'Vendedores' },
];

/**
 * Segundo nivel de pestañas, dentro de la de Reportes.
 *
 * Se anidan en vez de colgar los seis reportes del menú principal de Ventas
 * porque ahí ya hay seis secciones operativas: doce pestañas en una sola fila
 * dejarían de leerse como un menú.
 */
@Component({
  selector: 'app-reportes-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex flex-col gap-5">
      <nav class="flex flex-wrap gap-1.5" aria-label="Reportes de Ventas">
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'ventas', 'reportes', pestana.segmento]"
            routerLinkActive="!bg-action !text-on-action !border-action"
            class="rounded-full border border-outline-variant px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            {{ pestana.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </div>
  `,
})
export class ReportesLayout {
  private readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
