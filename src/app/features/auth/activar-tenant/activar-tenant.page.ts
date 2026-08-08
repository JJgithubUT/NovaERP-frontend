import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { TenantActivado } from '../../../api/models';
import { PlataformaApi } from '../../../api/services/plataforma.api';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Activación de una organización recién creada (RF-01, cierre del flujo de alta).
 *
 * La consume el **administrador inicial**, no el SysAdmin: define su contraseña
 * y, en cascada, su usuario y la organización pasan a `activo`. Hasta que ocurre,
 * el entorno existe pero nadie puede entrar.
 *
 * Es pública y va por un endpoint propio, distinto del login y distinto del
 * `/activar` de los usuarios normales: quien llega **todavía no puede
 * autenticarse**, así que la autorización la da el token del enlace. Tampoco vale
 * el flujo de recuperación de contraseña, que exige una cuenta ya activa — por eso
 * un enlace vencido solo se arregla desde el portal, reenviándolo.
 *
 * Sobre la política de contraseña: el mínimo y el patrón viven en la
 * configuración del tenant y solo se consultan con sesión iniciada. Aquí se
 * comprueba únicamente que no esté vacía y que las dos copias coincidan; la regla
 * real la aplica el backend y su 422 dice cuál es. Inventar un número aquí sería
 * mentir en cuanto cambiara el valor por defecto.
 */
@Component({
  selector: 'app-activar-tenant-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CampoComponent, IconComponent, RouterLink],
  template: `
    <main class="grid min-h-dvh place-items-center bg-background p-6">
      <div class="w-full max-w-sm">
        <div
          class="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 shadow-sm"
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-md bg-surface-container-high"
            >
              <app-icon
                [name]="activada() ? 'check_circle' : 'business'"
                [size]="28"
                class="text-action"
              />
            </div>
            <h1 class="mt-4 text-headline-md font-bold text-primary">
              {{ activada() ? 'Organización activada' : 'Activa tu organización' }}
            </h1>
            <p class="mt-1 text-body-sm text-on-surface-variant">
              @if (activada(); as resultado) {
                <strong class="text-on-surface">{{ resultado.razon_social }}</strong> ya está activa
                y tu cuenta quedó lista.
              } @else {
                Define la contraseña de tu cuenta de administrador. Con eso se inicializa el entorno
                y tu equipo puede empezar a entrar.
              }
            </p>
          </div>

          @if (activada(); as resultado) {
            <div
              class="mt-6 flex flex-col gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-3 text-body-sm text-on-surface-variant"
            >
              <p>
                El identificador de tu organización es
                <code class="font-mono text-mono-sm text-on-surface">{{ resultado.slug }}</code
                >: te lo pedirán al iniciar sesión.
              </p>
              <p>
                En tu primer acceso se te pedirá configurar la autenticación de dos factores. Ten a
                mano tu aplicación de autenticación.
              </p>
            </div>

            <a routerLink="/login" class="btn btn-primario mt-6 w-full py-3">
              Ir al inicio de sesión
              <app-icon name="arrow_forward" [size]="18" />
            </a>
          } @else {
            <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="enviar()">
              @if (errorGeneral(); as mensaje) {
                <p
                  class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
                  role="alert"
                >
                  {{ mensaje }}
                </p>
              }

              @if (!token()) {
                <app-campo
                  etiqueta="Token de activación"
                  paraId="token"
                  [error]="errorDe('token')"
                  ayuda="Viene en el enlace que recibiste por correo."
                >
                  <input id="token" class="campo-control font-mono" formControlName="token" />
                </app-campo>
              }

              <app-campo etiqueta="Contraseña" paraId="password" [error]="errorDe('password')">
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2"
                >
                  <app-icon name="lock" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="password"
                    [type]="verPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="w-full bg-transparent text-body-md text-on-surface outline-none"
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
              </app-campo>

              <app-campo
                etiqueta="Confirma la contraseña"
                paraId="confirmacion"
                [error]="errorConfirmacion()"
              >
                <input
                  id="confirmacion"
                  [type]="verPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="campo-control"
                  formControlName="confirmacion"
                />
              </app-campo>

              <button type="submit" class="btn btn-primario mt-2 py-3" [disabled]="enviando()">
                {{ enviando() ? 'Activando…' : 'Activar y crear mi contraseña' }}
                @if (!enviando()) {
                  <app-icon name="arrow_forward" [size]="18" />
                }
              </button>
            </form>

            <p class="mt-5 text-center text-label-md text-on-surface-variant">
              El enlace es de un solo uso y vence 24 horas después de emitirse. Si ya expiró, pide
              uno nuevo a quien registró tu organización.
            </p>
          }
        </div>
      </div>
    </main>
  `,
})
export class ActivarTenantPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(PlataformaApi);

  /** `?token=…` del enlace, enlazado por `withComponentInputBinding`. */
  readonly token = input('');

  protected readonly verPassword = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<unknown>(null);
  protected readonly activada = signal<TenantActivado | null>(null);

  protected readonly form = this.fb.group({
    token: this.fb.control(''),
    password: this.fb.control('', Validators.required),
    confirmacion: this.fb.control('', Validators.required),
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched && control.hasError('required')) return 'Este campo es obligatorio.';
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected errorConfirmacion(): string {
    const { password, confirmacion } = this.form.getRawValue();
    const control = this.form.controls.confirmacion;
    if (control.touched && control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.touched && confirmacion !== '' && password !== confirmacion) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  }

  protected async enviar(): Promise<void> {
    if (this.enviando()) return;

    this.form.markAllAsTouched();
    const { password, confirmacion } = this.form.getRawValue();
    // El token del enlace manda sobre el escrito a mano: si viene en la URL, el
    // campo ni se muestra.
    const token = this.token() || this.form.getRawValue().token.trim();

    if (!token) {
      this.error.set(null);
      this.form.controls.token.setErrors({ required: true });
      return;
    }
    if (this.form.invalid || password !== confirmacion) return;

    this.enviando.set(true);
    this.error.set(null);

    try {
      this.activada.set(await this.api.activarTenant({ token, password }));
    } catch (error: unknown) {
      this.error.set(error);
    } finally {
      this.enviando.set(false);
    }
  }
}
