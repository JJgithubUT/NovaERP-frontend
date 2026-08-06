import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

const PESTANAS = [
  { segmento: 'perfil', label: 'Mi perfil' },
  { segmento: 'sesiones', label: 'Mis sesiones' },
] as const;

/**
 * Autoservicio de la cuenta propia.
 *
 * Nada de aquí exige permisos de catálogo: basta con estar autenticado y ser el
 * dueño del registro (FLUJO-USUARIOS §5). Por eso vive fuera de
 * «Administración» — meterlo ahí lo escondería de la mayoría de usuarios, que
 * son justamente quienes lo necesitan.
 */
@Component({
  selector: 'app-cuenta-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="flex flex-col gap-6">
      <header>
        <h1 class="text-display-lg text-primary">Mi cuenta</h1>
        <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Tus datos personales y los dispositivos donde tienes la sesión abierta.
        </p>
      </header>

      <nav
        class="flex gap-1 overflow-x-auto border-b border-outline-variant"
        aria-label="Secciones de mi cuenta"
      >
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'cuenta', pestana.segmento]"
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
export class CuentaLayout {
  private readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
