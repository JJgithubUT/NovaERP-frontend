import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SwUpdateService } from '../../core/pwa/sw-update.service';

/** Aviso de versión nueva. El usuario decide cuándo recargar, no la app. */
@Component({
  selector: 'app-update-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sw.updateReady()) {
      <div
        role="status"
        class="flex shrink-0 items-center justify-center gap-3 bg-inverse-surface px-4 py-2 text-body-sm text-inverse-on-surface"
      >
        <span>Hay una versión nueva de NovaERP.</span>
        <button
          type="button"
          (click)="sw.aplicarUpdate()"
          class="rounded bg-inverse-on-surface px-2 py-0.5 text-label-md font-medium text-inverse-surface transition-opacity hover:opacity-80"
        >
          Actualizar
        </button>
      </div>
    }
  `,
})
export class UpdatePromptComponent {
  protected readonly sw = inject(SwUpdateService);
}
