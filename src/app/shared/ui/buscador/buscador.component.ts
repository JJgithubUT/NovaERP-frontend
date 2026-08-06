import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

const DEBOUNCE_MS = 300;

/**
 * Caja de búsqueda con rebote.
 *
 * El rebote no es un lujo: sin él, escribir "tornillo" dispara ocho peticiones
 * y las respuestas pueden llegar desordenadas, dejando en pantalla el resultado
 * de "torn" por encima del de "tornillo".
 *
 * Emite por `buscar`, no por `input`, para que el padre solo se entere del
 * valor ya estabilizado.
 */
@Component({
  selector: 'app-buscador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action sm:w-80"
    >
      <app-icon name="search" [size]="18" class="text-on-surface-variant" />
      <input
        type="search"
        class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
        [placeholder]="marcador()"
        [attr.aria-label]="marcador()"
        (input)="alEscribir($event)"
      />
    </div>
  `,
})
export class BuscadorComponent {
  readonly marcador = input('Buscar…');

  readonly buscar = output<string>();

  private readonly escrito$ = new Subject<string>();

  constructor() {
    this.escrito$
      .pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((texto) => this.buscar.emit(texto));
  }

  protected alEscribir(evento: Event): void {
    this.escrito$.next((evento.target as HTMLInputElement).value);
  }
}
