import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * TODO: dashboard. Ver `templatesejemplos/novaerp_executive_dashboard` para el
 * diseño de destino.
 *
 * Por ahora confirma que la sesión y el contexto de `/api/core/me/` cargaron.
 * Las tarjetas de métricas de la plantilla están sin poner a propósito: el
 * Sprint 1 no tiene endpoints de agregados, y rellenarlas con datos inventados
 * sería peor que no tenerlas.
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-display-lg text-primary">
          Hola, {{ store.usuario()?.nombre_completo ?? 'usuario' }}
        </h1>
        <p class="mt-1 text-body-md text-on-surface-variant">
          {{ store.tenant()?.razon_social }} · plan {{ store.tenant()?.plan }}
        </p>
      </header>

      <dl class="grid gap-4 sm:grid-cols-3">
        @for (dato of resumen(); track dato.label) {
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-5">
            <dt class="flex items-center gap-2 text-label-caps uppercase text-on-surface-variant">
              <app-icon [name]="dato.icono" [size]="16" />
              {{ dato.label }}
            </dt>
            <dd class="mt-2 text-headline-sm text-on-surface" [class.font-mono]="dato.mono">
              {{ dato.valor }}
            </dd>
          </div>
        }
      </dl>
    </section>
  `,
})
export class InicioPage {
  protected readonly store = inject(AuthStore);

  protected readonly resumen = () => [
    {
      label: 'Roles',
      icono: 'badge',
      valor: this.store.roles().join(', ') || '—',
      mono: false,
    },
    {
      label: 'Módulos',
      icono: 'widgets',
      valor: String(this.store.modulos().length),
      mono: false,
    },
    {
      label: 'Tenant',
      icono: 'domain',
      valor: this.store.tenantSlug() ?? '—',
      mono: true,
    },
  ];
}
