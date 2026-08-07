import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import type { ConfigSeguridad, ConfigSeguridadUpdate } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

/** Campos numéricos editables, en el orden en que se presentan. */
const CAMPOS = [
  {
    clave: 'politica_password_min_len',
    etiqueta: 'Longitud mínima de contraseña',
    ayuda: 'Se aplica a las contraseñas nuevas, no a las ya fijadas.',
  },
  {
    clave: 'jwt_expiracion_horas',
    etiqueta: 'Duración de la sesión (horas)',
    ayuda: 'Pasado ese tiempo hay que volver a iniciar sesión. No hay refresco automático.',
  },
  {
    clave: 'intentos_max_ventana',
    etiqueta: 'Intentos fallidos permitidos',
    ayuda: 'Cuántos fallos de contraseña se toleran dentro de la ventana.',
  },
  {
    clave: 'ventana_minutos',
    etiqueta: 'Ventana de conteo (minutos)',
    ayuda: 'Periodo en el que se cuentan los intentos fallidos.',
  },
  {
    clave: 'bloqueo_minutos',
    etiqueta: 'Bloqueo tras superar los intentos (minutos)',
    ayuda: 'Cuánto tiempo queda bloqueada la cuenta antes de poder reintentar.',
  },
] as const satisfies readonly { clave: keyof ConfigSeguridad; etiqueta: string; ayuda: string }[];

type ClaveCampo = (typeof CAMPOS)[number]['clave'];

/**
 * Políticas de seguridad del tenant.
 *
 * Cada campo tiene un rango que impone la **plataforma**, y viene en la propia
 * respuesta (`limites_plataforma`). El formulario valida contra él en vez de
 * llevar números fijos: los límites pueden cambiar del lado del servidor sin
 * que este código se entere, y una validación local desactualizada rechazaría
 * valores perfectamente legales.
 *
 * `updated_at` en `null` significa que el tenant nunca guardó su política y lo
 * que se ve son los valores por defecto. Merece decirse: no es lo mismo
 * "alguien decidió esto" que "nadie lo ha tocado".
 */
@Component({
  selector: 'app-seguridad-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent],
  template: `
    <div class="flex max-w-2xl flex-col gap-5">
      <div>
        <h2 class="text-headline-sm text-on-surface">Políticas de seguridad</h2>
        <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
          Reglas de contraseña, duración de sesión y bloqueo por intentos fallidos.
        </p>
      </div>

      @if (consulta.isPending()) {
        <p class="text-body-sm text-on-surface-variant">Cargando…</p>
      } @else if (consulta.isError()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ errorCarga() }}
        </p>
      } @else if (consulta.data(); as config) {
        @if (config.updated_at === null) {
          <p
            class="rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"
          >
            Tu empresa aún no ha definido su política: estos son los valores por defecto de la
            plataforma.
          </p>
        } @else {
          <p class="text-label-md text-on-surface-variant">
            Última actualización: {{ fechaHora(config.updated_at) }}
          </p>
        }

        <div
          class="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-5"
        >
          @if (errorGeneral(); as mensaje) {
            <p
              class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
              role="alert"
            >
              {{ mensaje }}
            </p>
          }

          @for (campo of campos; track campo.clave) {
            <app-campo
              [etiqueta]="campo.etiqueta"
              [paraId]="campo.clave"
              [error]="errorDe(campo.clave)"
              [ayuda]="ayudaCon(campo.clave, campo.ayuda)"
            >
              <input
                [id]="campo.clave"
                type="number"
                class="campo-control"
                [min]="limite(campo.clave)?.min"
                [max]="limite(campo.clave)?.max"
                [value]="valor(campo.clave)"
                (input)="fijar(campo.clave, $any($event.target).value)"
              />
            </app-campo>
          }

          <button
            type="button"
            class="btn btn-primario self-start"
            [disabled]="guardado.isPending() || !valido()"
            (click)="guardar()"
          >
            {{ guardado.isPending() ? 'Guardando…' : 'Guardar políticas' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class SeguridadPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly campos = CAMPOS;

  /** Valores del formulario como texto; se convierten al enviar. */
  protected readonly valores = signal<Record<string, string>>({});

  protected readonly consulta = injectQuery(() => ({
    queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'config-seguridad'),
    queryFn: () => this.api.configSeguridad(),
  }));

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: ConfigSeguridadUpdate) => this.api.editarConfigSeguridad(datos),
    onSuccess: () => {
      this.toasts.exito('Políticas actualizadas.');
      void this.queryClient.invalidateQueries({
        queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'config-seguridad'),
      });
    },
    onError: (error: unknown) => {
      if (!campoDeError(error)) this.toasts.error(mensajeDeError(error));
    },
  }));

  protected readonly fechaHora = formatFechaHora;

  protected readonly errorGeneral = computed(() => {
    const error = this.guardado.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(() =>
    CAMPOS.every((campo) => this.errorDe(campo.clave) === ''),
  );

  constructor() {
    // Siembra el formulario la primera vez que llegan los datos. La guarda
    // evita que un refetch de fondo pise lo que se esté escribiendo.
    effect(() => {
      const config = this.consulta.data();
      if (!config || Object.keys(this.valores()).length > 0) return;

      this.valores.set(
        Object.fromEntries(CAMPOS.map((campo) => [campo.clave, String(config[campo.clave])])),
      );
    });
  }

  protected errorCarga(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar la configuración.');
  }

  protected limite(clave: ClaveCampo) {
    return this.consulta.data()?.limites_plataforma[clave];
  }

  protected valor(clave: ClaveCampo): string {
    return this.valores()[clave] ?? '';
  }

  protected fijar(clave: ClaveCampo, valor: string): void {
    this.valores.update((actual) => ({ ...actual, [clave]: valor }));
  }

  /** Añade el rango permitido al texto de ayuda, si la plataforma lo declara. */
  protected ayudaCon(clave: ClaveCampo, ayuda: string): string {
    const limite = this.limite(clave);
    return limite ? `${ayuda} Permitido: entre ${limite.min} y ${limite.max}.` : ayuda;
  }

  protected errorDe(clave: ClaveCampo): string {
    const bruto = this.valor(clave).trim();
    if (bruto === '') return 'Este campo es obligatorio.';

    const numero = Number(bruto);
    if (!Number.isInteger(numero)) return 'Debe ser un número entero.';

    const limite = this.limite(clave);
    if (limite && (numero < limite.min || numero > limite.max)) {
      return `Debe estar entre ${limite.min} y ${limite.max}.`;
    }

    return campoDeError(this.guardado.error()) === clave
      ? mensajeDeError(this.guardado.error())
      : '';
  }

  protected guardar(): void {
    if (!this.valido() || this.guardado.isPending()) return;

    this.guardado.mutate(
      Object.fromEntries(
        CAMPOS.map((campo) => [campo.clave, Number(this.valor(campo.clave))]),
      ) as ConfigSeguridadUpdate,
    );
  }
}
