import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatMoneda, isNonNegative } from '../../../shared/utils/decimal.util';

/**
 * Umbral de aprobación de compras (FLUJO-COMPRAS §5).
 *
 * Es la única configuración editable del módulo, y gobierna una regla concreta:
 * toda orden cuyo total lo supere nace en `pendiente_aprobacion` y no admite
 * recepciones hasta que alguien la apruebe. Un umbral de 0 obliga a aprobar
 * absolutamente todo.
 */
@Component({
  selector: 'app-configuracion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent],
  template: `
    <div class="flex max-w-xl flex-col gap-5">
      <div>
        <h2 class="text-headline-sm text-on-surface">Umbral de aprobación</h2>
        <p class="mt-0.5 text-body-sm text-on-surface-variant">
          Toda orden de compra cuyo total supere este monto nacerá pendiente de aprobación y no
          admitirá recepciones hasta aprobarse.
        </p>
      </div>

      @if (consulta.isPending()) {
        <p class="text-body-sm text-on-surface-variant">Cargando…</p>
      } @else if (consulta.isError()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ errorCarga() }}
        </p>
      } @else {
        <div
          class="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-5"
        >
          @if (errorGuardado(); as mensaje) {
            <p
              class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
              role="alert"
            >
              {{ mensaje }}
            </p>
          }

          <p class="text-body-sm text-on-surface-variant">
            Umbral vigente:
            <strong class="font-mono text-on-surface">{{ vigente() }}</strong>
          </p>

          <app-campo
            etiqueta="Nuevo umbral"
            paraId="umbral"
            [error]="errorCampo()"
            ayuda="Debe ser un número mayor o igual a 0. Con 0, todas las órdenes requerirán aprobación."
          >
            <input
              id="umbral"
              class="campo-control"
              inputmode="decimal"
              [value]="umbral()"
              (input)="umbral.set($any($event.target).value)"
            />
          </app-campo>

          <button
            type="button"
            class="btn btn-primario self-start"
            [disabled]="guardado.isPending() || !valido()"
            (click)="guardar()"
          >
            {{ guardado.isPending() ? 'Guardando…' : 'Guardar umbral' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class ConfiguracionPage {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly umbral = signal('');

  protected readonly consulta = injectQuery(() => ({
    queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'config-aprobacion'),
    queryFn: () => this.api.obtenerConfigAprobacion(),
  }));

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (umbral_monto: string) => this.api.editarConfigAprobacion({ umbral_monto }),
    onSuccess: () => {
      this.toasts.exito('Umbral de aprobación actualizado.');
      void this.queryClient.invalidateQueries({
        queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'config-aprobacion'),
      });
    },
    onError: (error: unknown) => {
      if (!campoDeError(error)) this.toasts.error(mensajeDeError(error));
    },
  }));

  constructor() {
    // Siembra el campo cuando llegue el valor del servidor, y solo entonces:
    // sin la guarda, un refetch de fondo pisaría lo que el usuario esté
    // escribiendo.
    effect(() => {
      const config = this.consulta.data();
      if (config && this.umbral() === '') this.umbral.set(config.umbral_monto);
    });
  }

  protected vigente(): string {
    const config = this.consulta.data();
    return config ? formatMoneda(config.umbral_monto) : '—';
  }

  protected valido(): boolean {
    return isNonNegative(this.umbral());
  }

  protected errorCampo(): string {
    const valor = this.umbral().trim();
    if (valor !== '' && !isNonNegative(valor)) return 'Debe ser un número mayor o igual a 0.';
    return campoDeError(this.guardado.error()) === 'umbral_monto'
      ? mensajeDeError(this.guardado.error())
      : '';
  }

  protected errorGuardado(): string | null {
    const error = this.guardado.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  }

  protected errorCarga(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar la configuración.');
  }

  protected guardar(): void {
    if (!this.valido()) return;
    this.guardado.mutate(this.umbral().trim());
  }
}
