import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Icono de Material Symbols.
 *
 * Uso: `<app-icon name="inventory_2" />` o `<app-icon name="delete" [filled]="true" />`
 *
 * Existe por dos razones que no son cosmética:
 *
 * 1. **Accesibilidad.** El icon font funciona por ligaduras: el texto del
 *    elemento es literalmente `inventory_2`. Sin `aria-hidden`, un lector de
 *    pantalla lo lee tal cual, letra por letra. Aquí queda oculto por defecto,
 *    y si el icono es el único contenido de un botón, se le pasa `label`.
 * 2. **El subset.** Solo existen los 109 iconos de
 *    `public/fonts/README.md`; cualquier otro se ve como su nombre en texto.
 *    Centralizarlo da un único sitio donde buscar cuando eso pase.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="icon"
      [class.icon-filled]="filled()"
      [style.font-size.px]="size()"
      [attr.aria-hidden]="label() ? null : true"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      >{{ name() }}</span
    >
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
  `,
})
export class IconComponent {
  /** Nombre del símbolo, p. ej. `dashboard`. Debe estar en el subset. */
  readonly name = input.required<string>();

  /** Variante rellena. Las plantillas la usan para el ítem activo del menú. */
  readonly filled = input(false);

  readonly size = input(20);

  /**
   * Solo para iconos que cargan significado por sí solos (un botón que es
   * únicamente un icono). Si al lado hay texto que ya lo dice, déjalo vacío:
   * anunciarlo dos veces es peor que no anunciarlo.
   */
  readonly label = input('');
}
