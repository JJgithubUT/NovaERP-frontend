import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { ThemeService } from '../../core/theme/theme.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { UpdatePromptComponent } from '../update-prompt/update-prompt.component';
import { construirNavegacion } from '../navigation';

/**
 * El "Application Shell" del Flujo 1: la estructura que el Service Worker sirve
 * al instante desde caché, antes de que exista una sola respuesta del backend.
 *
 * Por eso el shell no pide datos: se pinta con lo que ya hay en el store (el
 * `me` cacheado). El contenido de cada módulo llega después, por su cuenta.
 *
 * El diseño sigue `templatesejemplos/novaerp_app_shell_layout_architecture`.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    OfflineBannerComponent,
    UpdatePromptComponent,
  ],
  template: `
    <div class="flex h-dvh overflow-hidden bg-background">
      @if (menuAbierto()) {
        <button
          type="button"
          class="fixed inset-0 z-40 bg-inverse-surface/40 md:hidden"
          aria-label="Cerrar menú"
          (click)="menuAbierto.set(false)"
        ></button>
      }

      <!-- Sidebar: drawer en móvil, fijo en desktop. Ver asideClases. -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col border-r border-outline-variant bg-surface-container-lowest py-4 transition-transform duration-200 md:static"
        [class]="asideClases()"
      >
        <div class="mb-8 flex items-center gap-3 px-container-margin">
          <div
            class="flex h-10 w-10 items-center justify-center rounded bg-action font-bold text-on-action"
          >
            N
          </div>
          <div class="min-w-0">
            <h1 class="truncate text-headline-sm font-bold text-primary">NovaERP</h1>
            <p class="truncate text-label-caps uppercase text-on-surface-variant">
              {{ store.tenant()?.razon_social ?? '—' }}
            </p>
          </div>
        </div>

        <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          <a
            [routerLink]="['/', tenantSlug(), 'inicio']"
            routerLinkActive="!bg-surface-container-high !text-primary !border-primary-container font-bold"
            class="flex items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            (click)="menuAbierto.set(false)"
          >
            <app-icon name="dashboard" />
            <span>Inicio</span>
          </a>

          @for (grupo of navegacion(); track grupo.codigo) {
            <p class="mt-4 px-3 pb-1 text-label-caps uppercase text-on-surface-variant">
              {{ grupo.label }}
            </p>
            @for (item of grupo.items; track item.label) {
              <a
                [routerLink]="item.link"
                routerLinkActive="!bg-surface-container-high !text-primary !border-primary-container font-bold"
                #activo="routerLinkActive"
                class="flex items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                (click)="menuAbierto.set(false)"
              >
                <app-icon [name]="item.icon" [filled]="activo.isActive" />
                <span>{{ item.label }}</span>
              </a>
            }
          } @empty {
            <p class="px-3 text-label-md text-on-surface-variant">Sin módulos habilitados.</p>
          }
        </nav>

        <div class="mt-auto flex flex-col gap-1 border-t border-outline-variant px-3 pt-4">
          <button
            type="button"
            (click)="logout()"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <app-icon name="logout" />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-30 flex h-topbar shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface px-container-margin"
        >
          <button
            type="button"
            class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low md:hidden"
            (click)="menuAbierto.set(true)"
          >
            <app-icon name="menu" label="Abrir menú" />
          </button>

          <!-- TODO: búsqueda global. Sin endpoint todavía: el openapi.yaml solo
               expone el parámetro search por catálogo, no uno transversal. -->
          <div class="hidden flex-1 md:block"></div>

          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              (click)="theme.toggle()"
            >
              <app-icon
                [name]="theme.isDark() ? 'light_mode' : 'dark_mode'"
                [label]="theme.isDark() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
              />
            </button>

            <div class="ml-2 flex items-center gap-2 border-l border-outline-variant pl-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant text-label-md font-semibold text-on-surface-variant"
                aria-hidden="true"
              >
                {{ iniciales() }}
              </div>
              <span class="hidden text-body-sm text-on-surface-variant sm:block">
                {{ store.usuario()?.nombre_completo }}
              </span>
            </div>
          </div>
        </header>

        <app-offline-banner />
        <app-update-prompt />

        <main class="flex-1 overflow-auto p-container-margin">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellLayout {
  protected readonly store = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  protected readonly tenantSlug = this.store.tenantSlug;
  protected readonly menuAbierto = signal(false);

  /**
   * Oculta el drawer, y solo en móvil: de ahí el `max-md:`.
   *
   * La alternativa sería un `-translate-x-full` incondicional neutralizado con
   * `md:translate-x-0` en desktop. Funciona —la regla de la media query gana
   * por orden de emisión—, pero deja el resultado atado a cómo Tailwind ordena
   * sus utilidades. Acotar la clase a móvil elimina el solapamiento: en
   * desktop la regla ni siquiera entra en juego.
   */
  protected readonly asideClases = computed(() =>
    this.menuAbierto() ? '' : 'max-md:-translate-x-full',
  );

  /** El sidebar es un derivado puro de los módulos del tenant. */
  protected readonly navegacion = computed(() =>
    construirNavegacion(this.store.modulos(), this.tenantSlug()),
  );

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

  protected logout(): void {
    void this.auth.logout();
  }
}
