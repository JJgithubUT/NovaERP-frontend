import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * 403: el recurso existe en tu tenant, pero tu rol no alcanza. Aquí sí se puede
 * ser explícito — no hay nada que filtrar entre tenants.
 */
@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <main class="grid min-h-dvh place-items-center bg-background p-6">
      <div class="flex flex-col items-center text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-md bg-error-container">
          <app-icon name="shield" [size]="28" class="text-on-error-container" />
        </div>
        <p class="mt-4 font-mono text-mono-sm text-on-surface-variant">403</p>
        <h1 class="mt-1 text-headline-md text-on-surface">Sin permiso</h1>
        <p class="mt-2 max-w-sm text-body-md text-on-surface-variant">
          Tu rol no tiene acceso a esta sección. Pide a un administrador que lo revise.
        </p>
        <a
          [routerLink]="inicio()"
          class="gradient-guinda mt-6 inline-block rounded px-4 py-2 text-label-md font-semibold transition-opacity hover:opacity-90"
        >
          Volver al inicio
        </a>
      </div>
    </main>
  `,
})
export class ForbiddenPage {
  private readonly store = inject(AuthStore);

  protected readonly inicio = () => {
    const slug = this.store.tenantSlug();
    return slug ? ['/', slug] : ['/login'];
  };
}
