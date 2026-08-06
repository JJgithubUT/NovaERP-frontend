import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

/**
 * Confirmación de una acción consecuente.
 *
 * Se usa para lo que no se deshace con otro clic: suspender a alguien,
 * resetearle el segundo factor, cerrarle las sesiones. El texto debe decir
 * **qué le pasa a la persona afectada**, no solo "¿estás seguro?" — es la
 * diferencia entre confirmar a ciegas y confirmar sabiendo.
 *
 * No sustituye al manejo del error: el backend sigue pudiendo rechazar la
 * acción (p. ej. el último administrador activo → 422).
 */
@Component({
  selector: 'app-confirmar-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal [titulo]="titulo()" (cerrar)="cancelar.emit()">
      @if (error()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ error() }}
        </p>
      }

      <p class="text-body-md text-on-surface">{{ mensaje() }}</p>

      @if (detalle()) {
        <p class="text-body-sm text-on-surface-variant">{{ detalle() }}</p>
      }

      <div footer>
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="enviando()"
          (click)="cancelar.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          [class]="peligroso() ? 'btn btn-peligro' : 'btn btn-primario'"
          [disabled]="enviando()"
          (click)="confirmar.emit()"
        >
          {{ enviando() ? 'Procesando…' : etiquetaConfirmar() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmarModal {
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  /** Consecuencia concreta: a quién afecta y desde cuándo. */
  readonly detalle = input('');
  readonly etiquetaConfirmar = input('Confirmar');
  /** Pinta el botón en rojo cuando la acción quita acceso a alguien. */
  readonly peligroso = input(false);
  readonly enviando = input(false);
  readonly error = input('');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
