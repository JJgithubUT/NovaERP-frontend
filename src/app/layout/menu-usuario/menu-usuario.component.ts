import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { ThemeService } from '../../core/theme/theme.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * Menú de la cuenta: se abre al pulsar el avatar de la barra superior.
 *
 * Tres entradas, y ninguna más: mi cuenta, mis sesiones y el tema. «Salir» se
 * queda en el pie del sidebar, donde ya estaba — tener el mismo botón en dos
 * sitios obliga a preguntarse si hacen lo mismo.
 *
 * El interruptor de tema **no cierra el panel**, y los dos enlaces sí. La
 * diferencia no es un descuido: cambiar el tema es una acción que se aprecia en
 * el sitio, y muchas veces se quiere volver atrás en el acto; cerrarlo obligaría
 * a reabrir el menú para deshacer. Navegar, en cambio, cambia de pantalla y el
 * panel ya no tiene sentido encima.
 *
 * ## Accesibilidad
 *
 * Es un `menu` de verdad, no un div con un `click`: el disparador declara
 * `aria-haspopup`/`aria-expanded`, el panel es `role="menu"`, los enlaces son
 * `menuitem` y el tema es un `menuitemcheckbox` con su `aria-checked`. Al abrir,
 * el foco entra en la primera entrada; con las flechas se recorre en ciclo y con
 * Escape se cierra devolviendo el foco al avatar, que es de donde vino. Sin esa
 * devolución, cerrar el menú deja el foco en la nada y quien navega por teclado
 * tiene que volver a tabular desde el principio de la página.
 */
@Component({
  selector: 'app-menu-usuario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  host: {
    class: 'relative',
    // El clic fuera cierra. El disparador vive DENTRO del host, así que su
    // propio clic no entra por aquí y no se cierra justo al abrirse.
    '(document:click)': 'alClicFuera($event)',
    '(document:keydown.escape)': 'cerrarYDevolverFoco()',
  },
  template: `
    <button
      #disparador
      type="button"
      class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-container-low"
      [attr.aria-expanded]="abierto()"
      aria-haspopup="menu"
      aria-controls="menu-usuario-panel"
      (click)="alternar()"
    >
      <span
        class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant text-label-md font-semibold text-on-surface-variant"
        aria-hidden="true"
      >
        {{ iniciales() }}
      </span>
      <span class="hidden max-w-40 truncate text-body-sm text-on-surface-variant sm:block">
        {{ nombre() }}
      </span>
      <app-icon
        name="chevron_right"
        [size]="16"
        class="text-on-surface-variant transition-transform"
        [class.rotate-90]="abierto()"
        [label]="abierto() ? 'Cerrar menú de la cuenta' : 'Abrir menú de la cuenta'"
      />
    </button>

    @if (abierto()) {
      <div
        #panel
        id="menu-usuario-panel"
        role="menu"
        class="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl"
        (keydown)="alTeclado($event)"
      >
        <!-- Quién eres. No es decorativo: con varias cuentas de prueba abiertas
             en el mismo navegador es lo primero que se necesita comprobar. -->
        <div class="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-variant text-label-md font-semibold text-on-surface-variant"
            aria-hidden="true"
          >
            {{ iniciales() }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-body-sm font-semibold text-on-surface">{{ nombre() }}</p>
            <p class="truncate font-mono text-mono-sm text-on-surface-variant">{{ correo() }}</p>
          </div>
        </div>

        <div class="py-1">
          <a
            role="menuitem"
            [routerLink]="enlacePerfil()"
            class="flex items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            (click)="cerrar()"
          >
            <app-icon name="badge" [size]="18" />
            Mi cuenta
          </a>

          <a
            role="menuitem"
            [routerLink]="enlaceSesiones()"
            class="flex items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            (click)="cerrar()"
          >
            <app-icon name="history" [size]="18" />
            Mis sesiones
          </a>
        </div>

        <div class="border-t border-outline-variant py-1">
          <!-- Etiqueta fija con interruptor de estado, y no un «cambiar a modo
               oscuro»: un texto que nombra el destino se lee tan fácil como el
               estado actual y deja al usuario adivinando cuál de las dos cosas
               dice. -->
          <button
            role="menuitemcheckbox"
            type="button"
            class="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            [attr.aria-checked]="tema.isDark()"
            (click)="alternarTema()"
          >
            <app-icon [name]="tema.isDark() ? 'dark_mode' : 'light_mode'" [size]="18" />
            <span class="flex-1 text-left">Modo oscuro</span>

            <!-- Interruptor decorativo: el estado lo comunica el aria-checked
                 del propio botón, así que aquí sobra cualquier rol. -->
            <span
              class="flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors"
              [class]="tema.isDark() ? 'bg-action' : 'bg-surface-variant'"
              aria-hidden="true"
            >
              <span
                class="h-4 w-4 rounded-full bg-surface-container-lowest shadow transition-transform"
                [class.translate-x-4]="tema.isDark()"
              ></span>
            </span>
          </button>
        </div>
      </div>
    }
  `,
})
export class MenuUsuarioComponent {
  private readonly store = inject(AuthStore);
  protected readonly tema = inject(ThemeService);

  private readonly disparador = viewChild.required<ElementRef<HTMLButtonElement>>('disparador');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly abierto = signal(false);

  protected readonly nombre = computed(() => this.store.usuario()?.nombre_completo ?? '—');
  protected readonly correo = computed(() => this.store.usuario()?.correo ?? '');

  private readonly tenantSlug = this.store.tenantSlug;

  protected readonly enlacePerfil = computed(() => ['/', this.tenantSlug(), 'cuenta', 'perfil']);
  protected readonly enlaceSesiones = computed(() => [
    '/',
    this.tenantSlug(),
    'cuenta',
    'sesiones',
  ]);

  /**
   * Iniciales en vez de una foto: el backend no expone avatar todavía. Las
   * plantillas tiran de una imagen remota de placeholder, que además de no
   * existir en nuestro dominio rompería el modo offline.
   */
  protected readonly iniciales = computed(() => {
    const nombre = this.store.usuario()?.nombre_completo?.trim();
    if (!nombre) return '?';

    const partes = nombre.split(/\s+/);
    const primera = partes[0]?.[0] ?? '';
    const segunda = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
    return (primera + segunda).toUpperCase();
  });

  constructor() {
    // El panel se crea y se destruye con el `@if`, así que la consulta de vista
    // cambia en cada apertura y el efecto vuelve a llevar el foco dentro.
    effect(() => {
      const panel = this.panel();
      if (panel) this.entradas(panel.nativeElement)[0]?.focus();
    });
  }

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  protected cerrar(): void {
    this.abierto.set(false);
  }

  protected cerrarYDevolverFoco(): void {
    if (!this.abierto()) return;

    this.abierto.set(false);
    this.disparador().nativeElement.focus();
  }

  protected alClicFuera(evento: Event): void {
    if (!this.abierto()) return;
    if (this.host.nativeElement.contains(evento.target as Node)) return;

    this.abierto.set(false);
  }

  /** Recorrido cíclico con flechas, como espera un `role="menu"`. */
  protected alTeclado(evento: KeyboardEvent): void {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;

    const panel = this.panel();
    if (!panel) return;

    evento.preventDefault();
    const entradas = this.entradas(panel.nativeElement);
    if (entradas.length === 0) return;

    const actual = entradas.indexOf(document.activeElement as HTMLElement);
    const paso = evento.key === 'ArrowDown' ? 1 : -1;
    // `actual` es -1 si el foco no está en ninguna entrada; con ArrowDown eso
    // cae en la primera, que es lo que se espera.
    const siguiente = (actual + paso + entradas.length) % entradas.length;
    entradas[siguiente]?.focus();
  }

  /** El tema no cierra el panel: ver la nota de la cabecera de la clase. */
  protected alternarTema(): void {
    this.tema.toggle();
  }

  private entradas(panel: HTMLElement): HTMLElement[] {
    return [...panel.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  }
}
