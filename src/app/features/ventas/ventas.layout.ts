import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

interface Pestana {
  readonly segmento: string;
  readonly label: string;
}

/**
 * Las pestañas siguen el orden de la cadena comercial (FLUJO-VENTAS §1):
 * clientes, luego oportunidad → cotización → pedido → factura. Leerlas de
 * izquierda a derecha es leer el ciclo de venta.
 */
const PESTANAS: readonly Pestana[] = [
  { segmento: 'clientes', label: 'Clientes' },
  { segmento: 'pipeline', label: 'Pipeline' },
  { segmento: 'oportunidades', label: 'Oportunidades' },
  { segmento: 'cotizaciones', label: 'Cotizaciones' },
  { segmento: 'pedidos', label: 'Pedidos' },
  { segmento: 'facturas', label: 'Facturas' },
];

@Component({
  selector: 'app-ventas-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="flex flex-col gap-6">
      <header>
        <h1 class="text-display-lg text-primary">Ventas</h1>
        <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Ciclo comercial completo: oportunidad, cotización, pedido y factura.
        </p>
      </header>

      <nav
        class="flex gap-1 overflow-x-auto border-b border-outline-variant"
        aria-label="Secciones de Ventas"
      >
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'ventas', pestana.segmento]"
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
export class VentasLayout {
  private readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
