import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CoreApi } from '../../../api/services/core.api';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Canje del enlace de restablecimiento (RF-18, segunda mitad).
 *
 * Pública y sin sesión: quien llega aquí olvidó su contraseña, así que la
 * autorización la da el token del enlace. Es de un solo uso y vive **1 hora**,
 * bastante menos que el de alta.
 *
 * Dos cosas que la pantalla avisa **antes** de que ocurran, no después:
 *
 * - **Se cierran todas las sesiones abiertas** (RN03). Quien tuviera la cuenta
 *   abierta en el móvil o en otro navegador queda fuera. Es lo correcto para un
 *   restablecimiento —puede que la contraseña se haya filtrado— pero enterarse
 *   a posteriori es desconcertante.
 * - **Habrá que volver a iniciar sesión**, con el segundo factor incluido.
 *
 * Un token inválido y uno caducado dan el mismo error, a propósito del backend
 * (CA02): distinguirlos diría a un atacante si el enlace existió.
 *
 * Sobre la política de contraseña: el mínimo y el patrón viven en la
 * configuración del tenant y no se pueden leer sin sesión. Aquí solo se
 * comprueba que no esté vacía y que las dos copias coincidan; la regla real la
 * aplica el backend y su 422 dice cuál es.
 */
@Component({
  selector: 'app-restablecer-page',
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
                [name]="listo() ? 'check_circle' : 'lock'"
                [size]="28"
                class="text-action"
              />
            </div>
            <h1 class="mt-4 text-headline-md font-bold text-primary">
              {{ listo() ? 'Contraseña actualizada' : 'Crea tu contraseña nueva' }}
            </h1>
            <p class="mt-1 text-body-sm text-on-surface-variant">
              @if (listo(); as mensaje) {
                {{ mensaje }}
              } @else {
                El enlace sirve una sola vez y caduca una hora después de pedirlo.
              }
            </p>
          </div>

          @if (listo()) {
            <a routerLink="/login" class="btn btn-primario mt-6 w-full py-3">
              Iniciar sesión
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

              <!-- El aviso va antes del formulario: cerrar las sesiones de otros
                   dispositivos es una consecuencia que conviene conocer antes de
                   confirmar, no descubrirla al quedarse fuera del móvil. -->
              <p
                class="rounded border border-warning bg-warning-container px-3 py-2.5 text-body-sm text-on-warning-container"
              >
                Al guardar se cerrarán <strong>todas</strong> tus sesiones abiertas, incluidas las
                de otros dispositivos, y tendrás que volver a entrar.
              </p>

              @if (!token()) {
                <app-campo
                  etiqueta="Código del enlace"
                  paraId="token"
                  [error]="errorDe('token')"
                  ayuda="Viene en el correo que recibiste."
                >
                  <input id="token" class="campo-control font-mono" formControlName="token" />
                </app-campo>
              }

              <app-campo
                etiqueta="Contraseña nueva"
                paraId="password"
                [error]="errorDe('password')"
              >
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
                etiqueta="Repite la contraseña"
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
                {{ enviando() ? 'Guardando…' : 'Guardar contraseña' }}
                @if (!enviando()) {
                  <app-icon name="arrow_forward" [size]="18" />
                }
              </button>
            </form>

            <p class="mt-5 text-center text-label-md text-on-surface-variant">
              ¿Caducó el enlace?
              <a routerLink="/recuperar" class="font-semibold text-action hover:underline">
                Pide otro
              </a>
            </p>
          }
        </div>
      </div>
    </main>
  `,
})
export class RestablecerPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(CoreApi);

  /** `?token=…` del enlace, enlazado por `withComponentInputBinding`. */
  readonly token = input('');

  protected readonly verPassword = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<unknown>(null);
  /** Mensaje del servidor tras restablecer. `null` = todavía no. */
  protected readonly listo = signal<string | null>(null);

  protected readonly form = this.fb.group({
    token: this.fb.control(''),
    password: this.fb.control('', Validators.required),
    confirmacion: this.fb.control('', Validators.required),
  });

  /**
   * Banner de error.
   *
   * Además de los errores sin campo, aquí caen los que señalan el `token`
   * **cuando su campo está oculto** porque el código vino en el enlace. Es el
   * caso más probable de todos —el enlace caducó— y sin esto el 422 no tenía
   * dónde pintarse: la pantalla se quedaba muda y parecía que el botón no hacía
   * nada.
   */
  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error) return null;

    const campo = campoDeError(error);
    if (!campo) return mensajeDeError(error);
    if (campo === 'token' && this.token().trim() !== '') return mensajeDeError(error);
    return null;
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
    // El token de la URL manda sobre el escrito a mano: si viene, el campo ni
    // se muestra.
    const token = this.token().trim() || this.form.getRawValue().token.trim();

    if (!token) {
      this.error.set(null);
      this.form.controls.token.setErrors({ required: true });
      return;
    }
    if (this.form.invalid || password !== confirmacion) return;

    this.enviando.set(true);
    this.error.set(null);

    try {
      const { mensaje } = await this.api.restablecerPassword({ token, password });
      this.listo.set(mensaje);
    } catch (error: unknown) {
      this.error.set(error);
    } finally {
      this.enviando.set(false);
    }
  }
}
