import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Contador de modales abiertos. Ver `bloquearScroll`. */
let abiertos = 0;

/**
 * Diálogo modal: cabecera con título, cuerpo desplazable y pie de acciones.
 *
 * Uso:
 * ```html
 * <app-modal titulo="Nuevo producto" (cerrar)="…">
 *   …campos…
 *   <div footer><button …>Guardar</button></div>
 * </app-modal>
 * ```
 *
 * El componente solo se renderiza cuando el padre lo mete en un `@if`. Eso es
 * deliberado: así el formulario de dentro se construye y se destruye con él, y
 * no hace falta el `useEffect` que reseteaba los campos en la versión React.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:keydown.escape)': 'cerrar.emit()',
  },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-inverse-surface/50 px-4 py-10"
      (mousedown)="alFondo($event)"
    >
      <div
        class="w-full rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl"
        [class]="anchoClase()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
      >
        <header
          class="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4"
        >
          <h2 class="text-headline-sm text-on-surface">{{ titulo() }}</h2>
          <button
            type="button"
            class="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            (click)="cerrar.emit()"
          >
            <app-icon name="close" [size]="20" label="Cerrar" />
          </button>
        </header>

        <div class="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-5 py-4">
          <ng-content />
        </div>

        <footer
          class="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant px-5 py-3.5"
        >
          <ng-content select="[footer]" />
        </footer>
      </div>
    </div>
  `,
})
export class ModalComponent {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly titulo = input.required<string>();
  /** `md` cubre los formularios de una columna; `lg`, los de dos. */
  readonly ancho = input<'md' | 'lg'>('md');

  readonly cerrar = output<void>();

  constructor() {
    this.bloquearScroll();
    // El foco entra al diálogo para que Tab y Escape actúen dentro y el lector
    // de pantalla anuncie el contexto nuevo en vez de seguir en la tabla.
    afterNextRender(() => this.enfocarPrimero());
  }

  protected anchoClase(): string {
    return this.ancho() === 'lg' ? 'max-w-2xl' : 'max-w-md';
  }

  /**
   * Cierra solo si el clic empezó en el fondo. Se escucha `mousedown` y se
   * compara contra `currentTarget`: con `click` a secas, arrastrar el cursor
   * desde un input hasta fuera del cuadro cerraría el diálogo a media
   * selección de texto.
   */
  protected alFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.cerrar.emit();
  }

  /**
   * Congela el scroll del fondo mientras haya un modal.
   *
   * El contador importa porque un modal puede abrir otro: si cada uno
   * restaurara el `overflow` al cerrarse, el primero en cerrar desbloquearía la
   * página con el segundo todavía encima.
   */
  private bloquearScroll(): void {
    const previo = document.body.style.overflow;
    if (abiertos === 0) document.body.style.overflow = 'hidden';
    abiertos += 1;

    inject(DestroyRef).onDestroy(() => {
      abiertos -= 1;
      if (abiertos === 0) document.body.style.overflow = previo;
    });
  }

  private enfocarPrimero(): void {
    const foco = this.host.nativeElement.querySelector<HTMLElement>(
      'input, select, textarea, button',
    );
    foco?.focus();
  }
}
