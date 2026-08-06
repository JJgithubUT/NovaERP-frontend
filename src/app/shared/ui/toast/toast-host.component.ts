import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService, type ToastTono } from './toast.service';

const TONOS: Readonly<Record<ToastTono, { clases: string; icono: string }>> = {
  exito: { clases: 'bg-success-container text-on-success-container', icono: 'check_circle' },
  error: { clases: 'bg-error-container text-on-error-container', icono: 'error' },
  aviso: { clases: 'bg-warning-container text-on-warning-container', icono: 'warning' },
};

/**
 * Pila de toasts. Va una sola vez, en el shell.
 *
 * `aria-live="polite"` y no `assertive`: el usuario acaba de pulsar Guardar, ya
 * está atento al resultado. Interrumpir lo que el lector esté diciendo sería
 * más molesto que esperar a que termine la frase.
 */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-body-sm shadow-lg"
          [class]="estilo(toast.tono).clases"
        >
          <app-icon [name]="estilo(toast.tono).icono" [size]="18" />
          <span class="flex-1">{{ toast.mensaje }}</span>
          <button
            type="button"
            class="opacity-70 transition-opacity hover:opacity-100"
            (click)="toasts.descartar(toast.id)"
          >
            <app-icon name="close" [size]="16" label="Descartar aviso" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);

  protected estilo(tono: ToastTono) {
    return TONOS[tono];
  }
}
