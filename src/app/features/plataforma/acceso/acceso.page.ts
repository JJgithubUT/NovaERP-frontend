import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { PlataformaService } from '../../../core/plataforma/plataforma.service';
import { RUTA_ORGANIZACIONES } from '../../../core/plataforma/rutas';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Acceso al portal de plataforma.
 *
 * Es de **una sola fase**, a diferencia del login de tenant: el backend no exige
 * segundo factor al SysAdmin, así que no hay pantalla de código que venga
 * después. Tampoco pide organización — el SysAdmin no pertenece a ninguna.
 *
 * El login de tenant no sirve para entrar aquí y no es un detalle de rutas: ese
 * formulario llama a `/api/auth/login/`, que busca en `core.usuario`, y la cuenta
 * del SysAdmin vive en `core.sysadmin`. Por ahí la respuesta siempre serían
 * credenciales inválidas.
 */
@Component({
  selector: 'app-acceso-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, RouterLink],
  template: `
    <main class="grid min-h-dvh place-items-center bg-inverse-surface p-6">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center gap-3">
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-action text-on-action"
          >
            <app-icon name="shield" [size]="24" />
          </span>
          <div>
            <p class="text-headline-sm text-inverse-on-surface">novaERP</p>
            <p class="text-label-caps uppercase text-inverse-on-surface/60">Portal de plataforma</p>
          </div>
        </div>

        <div
          class="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 shadow-2xl"
        >
          <h1 class="text-headline-sm text-on-surface">Acceso de administrador</h1>
          <p class="mt-1 text-body-sm text-on-surface-variant">
            Desde aquí se administran las organizaciones de la plataforma, no los datos de ninguna
            de ellas.
          </p>

          <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="enviar()">
            @if (error(); as mensaje) {
              <p
                class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
                role="alert"
              >
                {{ mensaje }}
              </p>
            }

            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant" for="correo">
                Correo
              </label>
              <div
                class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
              >
                <app-icon name="mail" [size]="18" class="text-on-surface-variant" />
                <input
                  id="correo"
                  type="email"
                  autocomplete="username"
                  placeholder="admin@novaerp.local"
                  class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  formControlName="correo"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant" for="password">
                Contraseña
              </label>
              <div
                class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
              >
                <app-icon name="lock" [size]="18" class="text-on-surface-variant" />
                <input
                  id="password"
                  [type]="verPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  formControlName="password"
                />
                <button
                  type="button"
                  class="text-on-surface-variant hover:text-on-surface"
                  (click)="verPassword.set(!verPassword())"
                >
                  <app-icon
                    [name]="verPassword() ? 'visibility_off' : 'visibility'"
                    [size]="18"
                    label="Mostrar u ocultar contraseña"
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primario mt-2 py-3"
              [disabled]="form.invalid || enviando()"
            >
              <span>{{ enviando() ? 'Validando…' : 'Entrar' }}</span>
              @if (!enviando()) {
                <app-icon name="arrow_forward" [size]="18" />
              }
            </button>
          </form>

          <p class="mt-6 text-center text-label-md text-on-surface-variant">
            ¿Eres usuario de una organización?
            <a routerLink="/login" class="font-semibold text-action hover:underline">
              Ir al acceso normal
            </a>
          </p>
        </div>

        <p class="mt-6 text-center text-label-md text-inverse-on-surface/60">
          Los intentos de acceso a este portal quedan en la bitácora de plataforma.
        </p>
      </div>
    </main>
  `,
})
export class AccesoPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly plataforma = inject(PlataformaService);
  private readonly router = inject(Router);

  protected readonly verPassword = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async enviar(): Promise<void> {
    if (this.form.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.error.set(null);

    const { correo, password } = this.form.getRawValue();

    try {
      await this.plataforma.login({ correo: correo.trim(), password });
      await this.router.navigateByUrl(RUTA_ORGANIZACIONES, { replaceUrl: true });
    } catch (error: unknown) {
      this.error.set(mensajeDeError(error, 'No se pudo iniciar sesión.'));
    } finally {
      this.enviando.set(false);
    }
  }
}
