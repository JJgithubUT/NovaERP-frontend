import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Familias semánticas. Cada una es un par contenedor/on-contenedor del tema. */
export type BadgeTono = 'neutro' | 'exito' | 'aviso' | 'error' | 'info';

const TONOS: Readonly<Record<BadgeTono, string>> = {
  neutro: 'bg-surface-container-high text-on-surface-variant',
  exito: 'bg-success-container text-on-success-container',
  aviso: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-tertiary-container text-on-tertiary-container',
};

/**
 * Etiqueta de estado.
 *
 * Los tonos son tokens, no colores sueltos: `exito` se ve verde en claro y en
 * oscuro sin que la pantalla que lo usa tenga que saberlo. La plantilla React
 * de la que viene esto escribía `bg-emerald-50 text-emerald-700`, que en tema
 * oscuro queda ilegible.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-label-caps uppercase"
      [class]="clases()"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tono = input<BadgeTono>('neutro');

  protected readonly clases = computed(() => TONOS[this.tono()]);
}
