import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

interface Pestana {
  readonly segmento: string;
  readonly label: string;
}

/**
 * Las siete vistas del módulo, en el orden en que se usan: primero consultar
 * (stock), luego mantener los catálogos, y al final la operación diaria.
 */
const PESTANAS: readonly Pestana[] = [
  { segmento: 'stock', label: 'Stock' },
  { segmento: 'productos', label: 'Productos' },
  { segmento: 'almacenes', label: 'Almacenes' },
  { segmento: 'kardex', label: 'Kardex' },
  { segmento: 'movimientos', label: 'Movimientos' },
  { segmento: 'transferencias', label: 'Transferencias' },
  { segmento: 'ajustes', label: 'Ajustes' },
  { segmento: 'alertas', label: 'Alertas' },
];

/**
 * Cabecera y pestañas del módulo de Inventario.
 *
 * Las pestañas son rutas hijas, no estado local como en la versión React. Eso
 * da URLs que se pueden compartir y marcar (`/acme/inventario/kardex`), permite
 * volver con el botón Atrás, y hace que cada vista se cargue en su propio chunk
 * en vez de bajar las ocho de golpe.
 */
@Component({
  selector: 'app-inventario-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="flex flex-col gap-6">
      <header>
        <h1 class="text-display-lg text-primary">Inventario</h1>
        <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Control de existencias, almacenes, movimientos y kardex.
        </p>
      </header>

      <nav
        class="flex gap-1 overflow-x-auto border-b border-outline-variant"
        aria-label="Secciones de Inventario"
      >
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'inventario', pestana.segmento]"
            routerLinkActive="!border-action !text-action font-semibold"
            class="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {{ pestana.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </section>
  `,
})
export class InventarioLayout {
  private readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
