import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

const PESTANAS = [{ segmento: 'usuarios', label: 'Usuarios' }] as const;

/**
 * Administración del tenant.
 *
 * Por ahora solo el directorio de usuarios; roles, políticas de seguridad y
 * bitácora entran en la siguiente tanda y añadirán sus pestañas aquí.
 */
@Component({
  selector: 'app-administracion-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="flex flex-col gap-6">
      <header>
        <h1 class="text-display-lg text-primary">Administración</h1>
        <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Quién puede entrar a {{ store.tenant()?.razon_social }} y con qué alcance.
        </p>
      </header>

      <nav
        class="flex gap-1 overflow-x-auto border-b border-outline-variant"
        aria-label="Secciones de administración"
      >
        @for (pestana of pestanas; track pestana.segmento) {
          <a
            [routerLink]="['/', tenantSlug(), 'administracion', pestana.segmento]"
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
export class AdministracionLayout {
  protected readonly store = inject(AuthStore);

  protected readonly pestanas = PESTANAS;
  protected readonly tenantSlug = computed(() => this.store.tenantSlug());
}
