import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import type { Sesion } from '../../api/models';
import { CoreApi } from '../../api/services/core.api';
import { AuthStore } from '../../core/auth/auth.store';
import { mensajeDeError } from '../../core/errors/mensaje-error';
import { qk } from '../../core/query/query-keys';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ConfirmarModal } from '../../shared/ui/confirmar/confirmar.modal';
import { FilaMensajeComponent } from '../../shared/ui/tabla/fila-mensaje.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatFechaHora } from '../../shared/utils/fecha.util';

/**
 * Mis sesiones abiertas, con logout remoto.
 *
 * Cerrar una sesión ajena es inmediato: su token deja de servir en la
 * siguiente petición. Cerrar **la actual** equivale a salir de la aplicación, y
 * por eso esa fila no ofrece el botón — para eso está «Salir» en el menú. Sin
 * esa distinción, el usuario se expulsaría a sí mismo creyendo que limpia otro
 * dispositivo.
 */
@Component({
  selector: 'app-sesiones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, ConfirmarModal, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Sesiones activas</h2>
          <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Dispositivos donde tu cuenta tiene la sesión abierta. Si no reconoces alguno, ciérralo y
            cambia tu contraseña.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="cerrarOtras.isPending() || otras() === 0"
          (click)="confirmarOtras.set(true)"
        >
          Cerrar las demás ({{ otras() }})
        </button>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>IP</th>
              <th>Iniciada</th>
              <th>Última actividad</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="5">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="5" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (sesion of consulta.data()?.results ?? []; track sesion.jti) {
                <tr>
                  <td class="max-w-xs">
                    <span class="block truncate">{{ sesion.dispositivo || 'Desconocido' }}</span>
                    @if (sesion.actual) {
                      <app-badge tono="info">Esta sesión</app-badge>
                    }
                  </td>
                  <td class="clave tenue">{{ sesion.ip_origen || '—' }}</td>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(sesion.iniciada_en) }}
                  </td>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(sesion.ultima_actividad) }}
                  </td>
                  <td class="text-right">
                    @if (!sesion.actual) {
                      <button
                        type="button"
                        class="btn-fila"
                        [disabled]="cerrarUna.isPending()"
                        (click)="enCierre.set(sesion)"
                      >
                        Cerrar
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="5">
                  No hay sesiones activas.
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (enCierre(); as sesion) {
      <app-confirmar-modal
        titulo="Cerrar sesión remota"
        mensaje="Se cerrará la sesión de este dispositivo."
        [detalle]="detalleCierre(sesion)"
        etiquetaConfirmar="Cerrar sesión"
        [peligroso]="true"
        [enviando]="cerrarUna.isPending()"
        [error]="errorCierre()"
        (confirmar)="cerrar(sesion)"
        (cancelar)="enCierre.set(null)"
      />
    }

    @if (confirmarOtras()) {
      <app-confirmar-modal
        titulo="Cerrar las demás sesiones"
        mensaje="Se cerrarán todas tus sesiones salvo la de este dispositivo."
        detalle="Tendrás que volver a iniciar sesión en el resto de dispositivos."
        etiquetaConfirmar="Cerrar las demás"
        [peligroso]="true"
        [enviando]="cerrarOtras.isPending()"
        [error]="errorOtras()"
        (confirmar)="cerrarOtras.mutate()"
        (cancelar)="confirmarOtras.set(false)"
      />
    }
  `,
})
export class SesionesPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly enCierre = signal<Sesion | null>(null);
  protected readonly confirmarOtras = signal(false);

  protected readonly consulta = injectQuery(() => ({
    queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'sesiones'),
    queryFn: () => this.api.misSesiones(),
  }));

  protected readonly cerrarUna = injectMutation(() => ({
    mutationFn: (sesion: Sesion) => this.api.cerrarSesion(sesion.jti),
    onSuccess: () => {
      this.toasts.exito('Sesión cerrada.');
      this.refrescar();
      this.enCierre.set(null);
    },
  }));

  protected readonly cerrarOtras = injectMutation(() => ({
    mutationFn: () => this.api.cerrarOtrasSesiones(),
    onSuccess: (resultado) => {
      this.toasts.exito(
        resultado.revocadas === 1
          ? 'Se cerró 1 sesión.'
          : `Se cerraron ${resultado.revocadas} sesiones.`,
      );
      this.refrescar();
      this.confirmarOtras.set(false);
    },
  }));

  protected readonly fechaHora = formatFechaHora;

  protected otras(): number {
    return (this.consulta.data()?.results ?? []).filter((sesion) => !sesion.actual).length;
  }

  protected detalleCierre(sesion: Sesion): string {
    const dispositivo = sesion.dispositivo || 'dispositivo desconocido';
    return `${dispositivo} · última actividad ${formatFechaHora(sesion.ultima_actividad)}`;
  }

  protected cerrar(sesion: Sesion): void {
    this.cerrarUna.mutate(sesion);
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar tus sesiones.');
  }

  protected errorCierre(): string {
    const error = this.cerrarUna.error();
    return error ? mensajeDeError(error) : '';
  }

  protected errorOtras(): string {
    const error = this.cerrarOtras.error();
    return error ? mensajeDeError(error) : '';
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({
      queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'sesiones'),
    });
  }
}
