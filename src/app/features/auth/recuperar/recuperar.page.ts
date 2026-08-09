import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CoreApi } from '../../../api/services/core.api';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Solicitud de restablecimiento de contraseña (RF-18, primera mitad).
 *
 * Es la única vía de vuelta para quien olvidó su contraseña: un administrador
 * **no** puede fijarla —el backend rechaza cualquier credencial en el PATCH de
 * usuario— y los enlaces de activación solo sirven para cuentas que todavía no
 * se han activado.
 *
 * ## Lo que esta pantalla no dice
 *
 * El backend responde **siempre el mismo mensaje**, exista el correo o no
 * (RN02): la respuesta no puede servir para averiguar quién tiene cuenta. Por
 * eso aquí se muestra su mensaje literal en vez de redactar un «te hemos enviado
 * un correo», que afirmaría algo que el servidor no ha confirmado. Y por eso el
 * botón no se deshabilita tras enviar: reintentarlo tampoco revela nada.
 *
 * ## Por qué pide la organización
 *
 * El backend busca al usuario por la pareja organización + correo, así que sin
 * el identificador no hay a quién buscar. Se arrastra desde el login por la
 * query string cuando se llega desde ahí, que es el camino normal.
 */
@Component({
  selector: 'app-recuperar-page',
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
              <app-icon [name]="enviado() ? 'mail' : 'lock'" [size]="28" class="text-action" />
            </div>
            <h1 class="mt-4 text-headline-md font-bold text-primary">
              {{ enviado() ? 'Revisa tu correo' : 'Restablecer contraseña' }}
            </h1>
            <p class="mt-1 text-body-sm text-on-surface-variant">
              @if (enviado()) {
                <!-- Mensaje del servidor, palabra por palabra: es deliberadamente
                     ambiguo sobre si el correo existe. -->
                {{ enviado() }}
              } @else {
                Te enviaremos un enlace para crear una contraseña nueva.
              }
            </p>
          </div>

          @if (enviado()) {
            <div
              class="mt-6 flex flex-col gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-3 text-body-sm text-on-surface-variant"
            >
              <p>El enlace caduca en <strong>1 hora</strong> y sirve una sola vez.</p>
              <p>
                Al crear la contraseña nueva se cerrarán todas tus sesiones abiertas, incluidas las
                de otros dispositivos.
              </p>
            </div>

            <button
              type="button"
              class="btn btn-secundario mt-4 w-full py-2.5"
              (click)="reiniciar()"
            >
              Usar otro correo
            </button>
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

              <app-campo
                etiqueta="Organización"
                paraId="tenant_slug"
                [error]="errorDe('tenant_slug')"
                ayuda="El mismo identificador con el que inicias sesión."
              >
                <input
                  id="tenant_slug"
                  class="campo-control font-mono"
                  autocomplete="organization"
                  placeholder="empresa-corp"
                  formControlName="tenant_slug"
                  (blur)="recortar('tenant_slug')"
                />
              </app-campo>

              <app-campo etiqueta="Correo electrónico" paraId="correo" [error]="errorDe('correo')">
                <input
                  id="correo"
                  type="email"
                  class="campo-control"
                  autocomplete="username"
                  placeholder="usuario@empresa.com"
                  formControlName="correo"
                  (blur)="recortar('correo')"
                />
              </app-campo>

              <button
                type="submit"
                class="btn btn-primario mt-2 py-3"
                [disabled]="enviando() || form.invalid"
              >
                {{ enviando() ? 'Enviando…' : 'Enviarme el enlace' }}
                @if (!enviando()) {
                  <app-icon name="arrow_forward" [size]="18" />
                }
              </button>
            </form>
          }

          <p class="mt-6 text-center text-label-md text-on-surface-variant">
            <a routerLink="/login" class="font-semibold text-action hover:underline">
              Volver al inicio de sesión
            </a>
          </p>
        </div>
      </div>
    </main>
  `,
})
export class RecuperarPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(CoreApi);

  /** `?tenant=` para no volver a escribir la organización al venir del login. */
  readonly tenant = input('');

  protected readonly enviando = signal(false);
  protected readonly error = signal<unknown>(null);
  /** Mensaje del servidor una vez enviada la solicitud. `null` = sin enviar. */
  protected readonly enviado = signal<string | null>(null);

  protected readonly form = this.fb.group({
    tenant_slug: this.fb.control('', Validators.required),
    correo: this.fb.control('', [Validators.required, Validators.email]),
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  /**
   * Los valores de los `input()` se asignan DESPUÉS del constructor: sembrar
   * desde ahí dejaría el campo vacío aunque el login pasara la organización.
   */
  ngOnInit(): void {
    const slug = this.tenant().trim();
    if (slug) this.form.patchValue({ tenant_slug: slug });
  }

  /**
   * Recorta los espacios al salir del campo.
   *
   * No es cosmético: `Validators.email` rechaza `' ana@acme.com '`, así que un
   * correo pegado del portapapeles —que suele arrastrar un espacio— dejaba el
   * botón deshabilitado con un «Correo no válido» que el usuario no puede
   * explicarse mirando lo que escribió.
   */
  protected recortar(campo: 'tenant_slug' | 'correo'): void {
    const control = this.form.controls[campo];
    const recortado = control.value.trim();
    if (recortado !== control.value) control.setValue(recortado);
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched) {
      if (control.hasError('required')) return 'Este campo es obligatorio.';
      if (control.hasError('email')) return 'Correo no válido.';
    }
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected async enviar(): Promise<void> {
    if (this.enviando()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.enviando.set(true);
    this.error.set(null);

    const { tenant_slug, correo } = this.form.getRawValue();

    try {
      const { mensaje } = await this.api.solicitarRestablecimiento({
        tenant_slug: tenant_slug.trim().toLowerCase(),
        correo: correo.trim(),
      });
      this.enviado.set(mensaje);
    } catch (error: unknown) {
      this.error.set(error);
    } finally {
      this.enviando.set(false);
    }
  }

  protected reiniciar(): void {
    this.enviado.set(null);
    this.error.set(null);
    this.form.reset({ tenant_slug: this.form.getRawValue().tenant_slug, correo: '' });
  }
}
