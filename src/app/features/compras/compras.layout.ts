import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

interface Pestana {
  readonly segmento: string;
  readonly label: string;
}

/** El orden sigue la cadena de abastecimiento (FLUJO-COMPRAS §1). */
const PESTANAS: readonly Pestana[] = [
  { segmento: 'proveedores', label: 'Proveedores' },
  { segmento: 'ordenes', label: 'Órdenes' },
  { segmento: 'recepciones', label: 'Recepciones' },
  { segmento: 'cuentas-por-pagar', label: 'Cuentas por pagar' },
  { segmento: 'configuracion', label: 'Configuración' },
];

@Component({
  selector: 'app-compras-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="flex flex-col gap-6">
      <header>
        <h1 class="text-display-lg text-primary">Compras</h1>
        <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Abastecimiento completo: proveedor, orden de compra, recepción y cuenta por pagar.
        </p>
      </header>

      <nav
        class="flex gap-1 overflow-x-auto border-b border-outline-variant"
        aria-label="Secciones de Compras"
      >
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'compras', pestana.segmento]"
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
export class ComprasLayout {
  private readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
