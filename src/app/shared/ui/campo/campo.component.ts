import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Envoltura de un control de formulario: etiqueta, ayuda y error.
 *
 * El `for`/`id` se pasa a mano (`paraId`) en vez de generarlo aquí porque el
 * control lo proyecta el padre y este componente no puede alcanzarlo para
 * ponerle el atributo. Sin esa pareja, pulsar la etiqueta no enfoca el campo.
 *
 * La ayuda desaparece cuando hay error: son la misma línea de texto y competir
 * por ella solo empuja el formulario hacia abajo mientras el usuario corrige.
 */
@Component({
  selector: 'app-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1.5">
      <label class="text-label-caps uppercase text-on-surface-variant" [attr.for]="paraId()">
        {{ etiqueta() }}
      </label>

      <ng-content />

      @if (error()) {
        <p class="text-label-md text-error" role="alert">{{ error() }}</p>
      } @else if (ayuda()) {
        <p class="text-label-md text-on-surface-variant">{{ ayuda() }}</p>
      }
    </div>
  `,
})
export class CampoComponent {
  readonly etiqueta = input.required<string>();
  /** `id` del control proyectado, para enlazarlo con la etiqueta. */
  readonly paraId = input('');
  readonly ayuda = input('');
  /** Mensaje del 422, ya mapeado por `ApiError.field`. */
  readonly error = input('');
}
