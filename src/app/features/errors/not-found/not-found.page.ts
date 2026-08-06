import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * 404 del cliente.
 *
 * Es también donde aterriza quien manipula la URL para colarse en otro tenant
 * (Flujo 2). El mensaje es deliberadamente genérico: decir "ese tenant no es el
 * tuyo" ya confirmaría que existe.
 */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <main class="grid min-h-dvh place-items-center bg-background p-6">
      <div class="flex flex-col items-center text-center">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-md bg-surface-container-high"
        >
          <app-icon name="help_center" [size]="28" class="text-on-surface-variant" />
        </div>
        <p class="mt-4 font-mono text-mono-sm text-on-surface-variant">404</p>
        <h1 class="mt-1 text-headline-md text-on-surface">No encontrado</h1>
        <p class="mt-2 max-w-sm text-body-md text-on-surface-variant">
          La página que buscas no existe o no está disponible para tu cuenta.
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
export class NotFoundPage {
  private readonly store = inject(AuthStore);

  protected readonly inicio = () => {
    const slug = this.store.tenantSlug();
    return slug ? ['/', slug] : ['/login'];
  };
}
