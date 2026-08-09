import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toDataURL } from 'qrcode';
import type { LoginChallengeResponse } from '../../../api/models';
import { isApiError } from '../../../core/errors/api-error.model';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Formulario de login, en dos fases (RN07): credenciales y luego OTP. El
 * backend nunca abre sesión en la fase 1 — su respuesta es siempre un `reto`,
 * nunca un `token`. Si `mfa === 'enroll'` es el primer login del usuario y el
 * `reto` trae además `secret`/`otpauth_uri` para dar de alta el TOTP antes de
 * confirmar el código.
 *
 * No distingue "usuario no existe" de "password incorrecta" en la fase 1, ni
 * "código incorrecto" de "reto expirado" en la fase 2: el backend manda el
 * mismo mensaje a propósito y la UI no debe inventarse la diferencia.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, RouterLink],
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
              <app-icon name="fingerprint" [size]="28" class="text-action" />
            </div>
            <h1 class="mt-4 text-headline-md font-bold text-primary">NovaERP</h1>
            <p class="mt-1 text-body-sm text-on-surface-variant">Plataforma Empresarial Segura</p>
          </div>

          <hr class="my-6 border-outline-variant" />

          @if (challenge(); as reto) {
            <form class="flex flex-col gap-4" [formGroup]="otpForm" (ngSubmit)="submitOtp()">
              @if (reto.mfa === 'enroll') {
                <div
                  class="flex flex-col items-center gap-2 rounded border border-outline-variant p-3"
                >
                  <p class="text-body-sm text-on-surface">
                    Primer inicio de sesión: configure su segundo factor en una app tipo Google
                    Authenticator antes de confirmar el código.
                  </p>
                  @if (qrCode(); as qr) {
                    <img
                      [src]="qr"
                      alt="Código QR para configurar el segundo factor"
                      width="180"
                      height="180"
                    />
                  }
                  <p class="break-all font-mono text-mono-sm text-on-surface-variant">
                    {{ reto.secret }}
                  </p>
                </div>
              }

              <div class="flex flex-col gap-1.5">
                <label class="text-label-caps uppercase text-on-surface-variant" for="codigo"
                  >Código de verificación</label
                >
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                >
                  <app-icon name="lock" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="codigo"
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    placeholder="123456"
                    class="w-full bg-transparent font-mono text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    formControlName="codigo"
                  />
                </div>
              </div>

              @if (errorMessage(); as mensaje) {
                <p
                  class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
                  role="alert"
                >
                  {{ mensaje }}
                </p>
              }

              <button
                type="submit"
                [disabled]="otpForm.invalid || submitting()"
                class="mt-2 flex items-center justify-center gap-2 rounded bg-action py-3 text-title-md font-semibold text-on-action transition-opacity disabled:opacity-50"
              >
                <span>{{ submitting() ? 'Verificando…' : 'Confirmar código' }}</span>
                @if (!submitting()) {
                  <app-icon name="arrow_forward" [size]="20" />
                }
              </button>

              <button
                type="button"
                class="text-center text-label-md text-on-surface-variant hover:text-on-surface"
                (click)="volverACredenciales()"
              >
                Volver
              </button>
            </form>
          } @else {
            <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
              <div class="flex flex-col gap-1.5">
                <label class="text-label-caps uppercase text-on-surface-variant" for="tenant_slug"
                  >Tenant / Empresa</label
                >
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                >
                  <app-icon name="business" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="tenant_slug"
                    type="text"
                    autocomplete="organization"
                    placeholder="empresa-corp"
                    class="w-full bg-transparent font-mono text-mono-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    formControlName="tenant_slug"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-label-caps uppercase text-on-surface-variant" for="correo"
                  >Correo electrónico</label
                >
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                >
                  <app-icon name="mail" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="correo"
                    type="email"
                    autocomplete="username"
                    placeholder="usuario@empresa.com"
                    class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    formControlName="correo"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-label-caps uppercase text-on-surface-variant" for="password"
                  >Contraseña</label
                >
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                >
                  <app-icon name="lock" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    formControlName="password"
                  />
                  <button
                    type="button"
                    class="text-on-surface-variant hover:text-on-surface"
                    (click)="showPassword.set(!showPassword())"
                  >
                    <app-icon
                      [name]="showPassword() ? 'visibility_off' : 'visibility'"
                      [size]="18"
                      label="Mostrar u ocultar contraseña"
                    />
                  </button>
                </div>
              </div>

              @if (errorMessage(); as mensaje) {
                <p
                  class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
                  role="alert"
                >
                  {{ mensaje }}
                </p>
              }

              <button
                type="submit"
                [disabled]="form.invalid || submitting()"
                class="mt-2 flex items-center justify-center gap-2 rounded bg-action py-3 text-title-md font-semibold text-on-action transition-opacity disabled:opacity-50"
              >
                <span>{{ submitting() ? 'Verificando…' : 'Ingresar' }}</span>
                @if (!submitting()) {
                  <app-icon name="arrow_forward" [size]="20" />
                }
              </button>

              <!-- Se arrastra la organización ya escrita: el restablecimiento la
                   necesita, y volver a teclearla es fricción gratuita. -->
              <a
                routerLink="/recuperar"
                [queryParams]="{ tenant: form.controls.tenant_slug.value }"
                class="text-center text-label-md text-on-surface-variant hover:text-on-surface"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </form>
          }

          <div
            class="mt-6 flex items-start gap-2 rounded bg-surface-container-low p-3 text-on-surface-variant"
          >
            <app-icon name="shield" [size]="16" />
            <p class="font-mono text-mono-sm">Sesión protegida por JWT. Accesos monitoreados.</p>
          </div>
        </div>

        <!-- El SysAdmin no entra por aquí: su cuenta no vive en core.usuario y
             su sesión es de otra superficie (/api/admin/login/). -->
        <p class="mt-6 text-center text-label-md text-on-surface-variant">
          ¿Administras la plataforma?
          <a routerLink="/admin/acceso" class="font-semibold text-action hover:underline">
            Portal de plataforma
          </a>
        </p>
      </div>
    </main>
  `,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly challenge = signal<LoginChallengeResponse | null>(null);
  readonly qrCode = signal<string | null>(null);

  readonly form = this.fb.group({
    tenant_slug: this.fb.control('', Validators.required),
    correo: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', Validators.required),
  });

  readonly otpForm = this.fb.group({
    codigo: this.fb.control('', Validators.required),
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const reto = await this.auth.login(this.form.getRawValue());
      this.challenge.set(reto);

      if (reto.mfa === 'enroll' && reto.otpauth_uri) {
        this.qrCode.set(await toDataURL(reto.otpauth_uri));
      }
    } catch (error) {
      this.errorMessage.set(isApiError(error) ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      this.submitting.set(false);
    }
  }

  async submitOtp(): Promise<void> {
    const reto = this.challenge();
    if (!reto || this.otpForm.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const me = await this.auth.verifyOtp(reto.reto, this.otpForm.getRawValue().codigo);
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
      await this.router.navigateByUrl(redirectTo || `/${me.tenant.slug}`, { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(isApiError(error) ? error.message : 'No se pudo validar el código.');
    } finally {
      this.submitting.set(false);
    }
  }

  volverACredenciales(): void {
    this.challenge.set(null);
    this.qrCode.set(null);
    this.errorMessage.set(null);
    this.otpForm.reset();
  }
}
