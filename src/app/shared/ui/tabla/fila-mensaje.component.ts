import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Fila que ocupa la tabla entera para decir "cargando", "sin datos" o "falló".
 *
 * El selector es `tr[appFilaMensaje]` y no un elemento propio a propósito: el
 * navegador solo admite `<tr>` como hijo de `<tbody>`, y un `<app-fila-…>` de
 * por medio lo saca de la tabla y descuadra las columnas.
 */
@Component({
  selector: 'tr[appFilaMensaje]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <td [attr.colspan]="columnas()" class="px-3 py-8 text-center text-body-sm" [class]="clase()">
      <ng-content />
    </td>
  `,
})
export class FilaMensajeComponent {
  /** Debe coincidir con el número de `<th>`, o la fila no cubre la tabla. */
  readonly columnas = input.required<number>();
  readonly tono = input<'tenue' | 'error'>('tenue');

  protected readonly clase = computed(() =>
    this.tono() === 'error' ? 'text-error' : 'text-on-surface-variant',
  );
}
