import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CatalogoPlataforma } from '../../core/plataforma/catalogo.store';
import { PlataformaService } from '../../core/plataforma/plataforma.service';
import { PlataformaStore } from '../../core/plataforma/plataforma.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ToastHostComponent } from '../../shared/ui/toast/toast-host.component';
import { formatFechaHora } from '../../shared/utils/fecha.util';

/**
 * Marco del portal de plataforma.
 *
 * No reutiliza `ShellLayout` a propósito. Ese shell está construido alrededor de
 * un tenant: sidebar de módulos contratados, nombre de la organización, banner de
 * trabajo offline. Aquí no hay tenant —se administran todos— y no hay nada que
 * hacer sin red, porque todo lo que se ve es cross-tenant y no se cachea. La
 * barra oscura es deliberada: que no se pueda confundir con el ERP de nadie.
 *
 * Hospeda su propio `app-toast-host`: el del tenant vive en `ShellLayout`, que
 * nunca se monta en esta rama del árbol de rutas.
 *
 * El catálogo (planes, módulos, dependencias) se pide una vez aquí y se comparte
 * con todas las pantallas hijas. Se espera a que llegue antes de pintarlas
 * porque sin él el alta no sabe qué planes están vigentes ni el editor de módulos
 * qué checkbox va bloqueado: pintar formularios con datos a medias solo produce
 * errores que el usuario no puede entender.
 */
@Component({
  selector: 'app-plataforma-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, IconComponent, ToastHostComponent],
  template: `
    <div class="flex min-h-dvh flex-col bg-background">
      <header class="sticky top-0 z-30 bg-inverse-surface">
        <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-action text-on-action"
            >
              <app-icon name="shield" [size]="18" />
            </span>
            <div>
              <p class="text-label-md font-semibold text-inverse-on-surface">novaERP</p>
              <p class="text-label-caps uppercase text-inverse-on-surface/60">
                Portal de plataforma
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            @if (store.correo(); as correo) {
              <div class="hidden text-right sm:block">
                <p class="text-label-md text-inverse-on-surface">{{ correo }}</p>
                @if (store.expiraEn(); as expira) {
                  <p
                    class="text-label-caps text-inverse-on-surface/60"
                    [attr.title]="tituloSesion()"
                  >
                    sesión hasta {{ fechaHora(expira) }}
                  </p>
                }
              </div>
            }

            <button
              type="button"
              class="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-label-md text-inverse-on-surface/80 transition-colors hover:bg-inverse-on-surface/10 hover:text-inverse-on-surface"
              (click)="salir()"
            >
              <app-icon name="logout" [size]="16" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        @if (catalogo.cargando()) {
          <p class="py-20 text-center text-body-sm text-on-surface-variant">
            Cargando catálogo de plataforma…
          </p>
        } @else if (catalogo.error(); as error) {
          <div class="py-20 text-center">
            <p class="text-body-md text-error">{{ error }}</p>
            <p class="mx-auto mt-2 max-w-prose text-body-sm text-on-surface-variant">
              El alta de organizaciones y el editor de módulos lo necesitan para no adivinar qué
              planes están vigentes ni qué módulos dependen de cuáles.
            </p>
            <button type="button" class="btn btn-secundario mt-4" (click)="reintentar()">
              Reintentar
            </button>
          </div>
        } @else if (catalogo.listo()) {
          <router-outlet />
        }
      </main>
    </div>

    <app-toast-host />
  `,
})
export class PlataformaLayout {
  protected readonly store = inject(PlataformaStore);
  protected readonly catalogo = inject(CatalogoPlataforma);
  private readonly plataforma = inject(PlataformaService);

  protected readonly fechaHora = formatFechaHora;

  constructor() {
    void this.catalogo.cargar();
  }

  /** La IP de origen de la sesión, como pista de dónde se abrió. */
  protected tituloSesion(): string {
    const ip = this.store.me()?.sesion?.ip_origen;
    return ip ? `Sesión abierta desde ${ip}` : '';
  }

  protected reintentar(): void {
    void this.catalogo.cargar();
  }

  protected salir(): void {
    void this.plataforma.salir();
  }
}
