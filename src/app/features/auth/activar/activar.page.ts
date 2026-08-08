import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoreApi } from '../../../api/services/core.api';
import { isApiError } from '../../../core/errors/api-error.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Activación de cuenta y reconfirmación de correo (RF-05 / RF-07·RN05).
 *
 * Cierra el ciclo del alta: el administrador crea al usuario y recibe un código
 * de un solo uso; sin esta pantalla ese código no tenía dónde canjearse y la
 * cuenta nueva se quedaba sin poder entrar nunca.
 *
 * Es pública a propósito: quien llega aquí **todavía no puede autenticarse**,
 * así que no hay sesión que exigir. La autorización la da el token, no un JWT.
 *
 * ## Los dos modos, y por qué los elige la persona
 *
 * El mismo endpoint sirve a dos flujos y **el backend decide cuál aplica por el
 * estado del registro**, no por lo que mande el cliente:
 *
 * - Si la cuenta aún no tiene contraseña, hay que fijarla.
 * - Si ya la tiene, el enlace solo reconfirma el correo, y mandar una
 *   contraseña se rechaza con 422 en vez de ignorarse — aceptarla en silencio
 *   convertiría un enlace de confirmación en un restablecimiento.
 *
 * No hay forma de preguntar de antemano en qué caso estamos: no existe un
 * endpoint que describa el token. Por eso el modo es una elección explícita en
 * la pantalla, con «fijar contraseña» por defecto, que es el caso común. Si se
 * elige mal, el 422 del backend lo dice con todas sus letras y basta cambiar el
 * interruptor. La alternativa —adivinar el modo leyendo el texto del error— se
 * descartó: dependería de una cadena que el backend puede reescribir cualquier
 * día sin avisar.
 *
 * ## Sobre la política de contraseña
 *
 * El mínimo de caracteres y el patrón viven en la configuración de cada tenant
 * y solo se consultan con sesión iniciada. Esta pantalla no la tiene, así que
 * aquí únicamente se comprueba que la contraseña no esté vacía y que las dos
 * copias coincidan; la regla real la aplica el backend y su 422 dice cuál es.
 * Inventar aquí un «mínimo 8 caracteres» sería mentir en los tenants que exijan
 * otra cosa.
 */
@Component({
  selector: 'app-activar-page',
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
              <!-- Solo iconos del subset de public/fonts: uno que no esté se
                   renderiza como su nombre en texto y el build no avisa. -->
              <app-icon
                [name]="listo() ? 'check_circle' : 'lock'"
                [size]="28"
                class="text-action"
              />
            </div>
            <h1 class="mt-4 text-headline-md font-bold text-primary">
              {{ listo() ? 'Cuenta lista' : 'Activar cuenta' }}
            </h1>
            <p class="mt-1 text-body-sm text-on-surface-variant">
              {{ subtitulo() }}
            </p>
          </div>

          <hr class="my-6 border-outline-variant" />

          @if (listo()) {
            <div class="flex flex-col gap-4">
              <p class="text-body-sm text-on-surface">
                Ya puedes iniciar sesión. En tu primer acceso se te pedirá configurar el segundo
                factor con una aplicación de autenticación.
              </p>
              <a
                routerLink="/login"
                class="flex items-center justify-center gap-2 rounded bg-action py-3 text-title-md font-semibold text-on-action"
              >
                Ir a iniciar sesión
                <app-icon name="arrow_forward" [size]="20" />
              </a>
            </div>
          } @else {
            <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="enviar()">
              <div class="flex flex-col gap-1.5">
                <label class="text-label-caps uppercase text-on-surface-variant" for="token">
                  Código de activación
                </label>
                <div
                  class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                >
                  <app-icon name="badge" [size]="18" class="text-on-surface-variant" />
                  <input
                    id="token"
                    type="text"
                    autocomplete="off"
                    placeholder="Pégalo aquí"
                    class="w-full bg-transparent font-mono text-mono-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    formControlName="token"
                  />
                </div>
                <p class="text-label-md text-on-surface-variant">
                  Es el código que te enviaron por correo. Caduca a las 24 horas y solo sirve una
                  vez.
                </p>
              </div>

              @if (fijarPassword()) {
                <div class="flex flex-col gap-1.5">
                  <label class="text-label-caps uppercase text-on-surface-variant" for="password">
                    Contraseña nueva
                  </label>
                  <div
                    class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
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
                        [label]="verPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                      />
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-label-caps uppercase text-on-surface-variant" for="repetir">
                    Repetir contraseña
                  </label>
                  <div
                    class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
                  >
                    <app-icon name="lock" [size]="18" class="text-on-surface-variant" />
                    <input
                      id="repetir"
                      [type]="verPassword() ? 'text' : 'password'"
                      autocomplete="new-password"
                      class="w-full bg-transparent text-body-md text-on-surface outline-none"
                      formControlName="repetir"
                    />
                  </div>
                  @if (noCoinciden()) {
                    <p class="text-label-md text-error" role="alert">
                      Las dos contraseñas no coinciden.
                    </p>
                  }
                </div>
              }

              <label class="flex items-start gap-2 text-body-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  class="mt-1"
                  [checked]="!fijarPassword()"
                  (change)="cambiarModo($any($event.target).checked)"
                />
                <span>
                  Solo estoy confirmando un cambio de correo; mi cuenta ya tiene contraseña.
                </span>
              </label>

              @if (errorMensaje(); as mensaje) {
                <p
                  class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
                  role="alert"
                >
                  {{ mensaje }}
                </p>
              }

              <button
                type="submit"
                [disabled]="!valido() || enviando()"
                class="mt-2 flex items-center justify-center gap-2 rounded bg-action py-3 text-title-md font-semibold text-on-action transition-opacity disabled:opacity-50"
              >
                <span>{{ enviando() ? 'Activando…' : textoBoton() }}</span>
                @if (!enviando()) {
                  <app-icon name="arrow_forward" [size]="20" />
                }
              </button>

              <a
                routerLink="/login"
                class="text-center text-label-md text-on-surface-variant hover:text-on-surface"
              >
                Volver a iniciar sesión
              </a>
            </form>
          }
        </div>

        <p class="mt-6 text-center text-label-md text-on-surface-variant">NovaERP</p>
      </div>
    </main>
  `,
})
export class ActivarPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(CoreApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly listo = signal(false);
  protected readonly verPassword = signal(false);
  protected readonly errorMensaje = signal<string | null>(null);
  /** Por defecto el caso común: cuenta nueva que aún no tiene contraseña. */
  protected readonly fijarPassword = signal(true);

  protected readonly form = this.fb.group({
    token: this.fb.control('', Validators.required),
    password: this.fb.control(''),
    repetir: this.fb.control(''),
  });

  protected readonly subtitulo = computed(() => {
    if (this.listo()) return 'Tu cuenta quedó activa';
    return this.fijarPassword() ? 'Fija tu contraseña para entrar' : 'Confirma tu correo nuevo';
  });

  protected readonly textoBoton = computed(() =>
    this.fijarPassword() ? 'Activar cuenta' : 'Confirmar correo',
  );

  constructor() {
    // El enlace del correo trae el código; si llega, se rellena y la persona
    // solo tiene que elegir contraseña.
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) this.form.patchValue({ token });
  }

  /**
   * Métodos y no `computed`: leen el formulario reactivo, que no es una señal.
   * Dentro de un `computed` el valor quedaría congelado en la primera lectura;
   * como métodos se reevalúan en cada ciclo de detección, y escribir en un
   * campo dispara uno. Es el mismo patrón que usa el login.
   */
  protected noCoinciden(): boolean {
    const { password, repetir } = this.form.getRawValue();
    return this.fijarPassword() && repetir !== '' && password !== repetir;
  }

  protected valido(): boolean {
    const { token, password, repetir } = this.form.getRawValue();
    if (token.trim() === '') return false;
    if (!this.fijarPassword()) return true;
    return password !== '' && password === repetir;
  }

  protected cambiarModo(soloCorreo: boolean): void {
    this.fijarPassword.set(!soloCorreo);
    this.errorMensaje.set(null);
    // Las contraseñas escritas antes de cambiar de modo no deben viajar: en
    // modo confirmación el backend rechaza la petición si van incluidas.
    this.form.patchValue({ password: '', repetir: '' });
  }

  protected async enviar(): Promise<void> {
    if (!this.valido() || this.enviando()) return;

    this.enviando.set(true);
    this.errorMensaje.set(null);

    const { token, password } = this.form.getRawValue();

    try {
      await this.api.activarCuenta({
        token: token.trim(),
        ...(this.fijarPassword() ? { password } : {}),
      });

      if (this.fijarPassword()) {
        this.listo.set(true);
      } else {
        // Reconfirmar el correo no cambia credenciales: no hay nada que
        // celebrar en pantalla, se va directo al login.
        await this.router.navigate(['/login'], { replaceUrl: true });
      }
    } catch (error) {
      this.errorMensaje.set(
        isApiError(error) ? error.message : 'No se pudo activar la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
