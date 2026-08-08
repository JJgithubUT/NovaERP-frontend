import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import type {
  ReenvioActivacion,
  SuspenderTenant,
  TenantDetalle,
  TenantUpdate,
} from '../../../api/models';
import { PlataformaApi } from '../../../api/services/plataforma.api';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { CatalogoPlataforma } from '../../../core/plataforma/catalogo.store';
import { qkPlataforma } from '../../../core/plataforma/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ConfirmarModal } from '../../../shared/ui/confirmar/confirmar.modal';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatFecha, formatFechaHora } from '../../../shared/utils/fecha.util';
import {
  ESTADO_TENANT_AYUDA,
  ESTADO_TENANT_LABEL,
  etiquetaFase,
  puedeDarDeBaja,
  puedeEditar,
  puedeReactivar,
  puedeReenviarActivacion,
  puedeSuspender,
  tonoTenant,
} from '../plataforma.labels';
import { EditarOrganizacionModal } from './editar-organizacion.modal';
import { EnlaceActivacionModal } from './enlace-activacion.modal';
import { ModulosModal } from './modulos.modal';
import { SuspenderModal } from './suspender.modal';

/**
 * Detalle de una organización (RF-02/CA05).
 *
 * Es donde viven las acciones que necesitan saber en qué estado está el entorno:
 * editar plan y gestionar módulos advierten de sus consecuencias con el consumo
 * de licencias y los módulos activos, y los dos datos solo llegan aquí.
 *
 * El cierre del texto no es relleno: delimita la superficie. El portal administra
 * *el contrato* de la organización —existencia, plan, módulos, estado—; quién
 * entra, con qué contraseña y con qué permisos lo administra su propio
 * TENANT_ADMIN, y desde aquí no hay acceso a esos datos.
 */
@Component({
  selector: 'app-organizacion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BadgeComponent,
    ConfirmarModal,
    EditarOrganizacionModal,
    EnlaceActivacionModal,
    IconComponent,
    ModulosModal,
    SuspenderModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <a
        routerLink="/admin/organizaciones"
        class="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-on-surface"
      >
        <app-icon name="chevron_left" [size]="16" />
        Todas las organizaciones
      </a>

      @if (consulta.isPending()) {
        <p class="py-16 text-center text-body-sm text-on-surface-variant">Cargando organización…</p>
      } @else if (consulta.isError()) {
        <p class="py-16 text-center text-body-sm text-error">{{ errorDetalle() }}</p>
      } @else if (consulta.data(); as tenant) {
        <header class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-display-lg text-primary">{{ tenant.razon_social }}</h1>
              <app-badge [tono]="tono(tenant.estado)" [attr.title]="ayuda(tenant.estado)">
                {{ etiquetaEstado(tenant.estado) }}
              </app-badge>
            </div>
            <p class="mt-1 text-body-md text-on-surface-variant">
              <span class="font-mono text-mono-sm text-on-surface">{{ tenant.slug }}</span>
              @if (tenant.dominio_comercial) {
                · {{ tenant.dominio_comercial }}
              }
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            @if (sePuedeEditar(tenant.estado)) {
              <button type="button" class="btn btn-secundario" (click)="abrirEdicion()">
                <app-icon name="edit" [size]="16" />
                Editar datos y plan
              </button>
            }
            @if (sePuedeReactivar(tenant.estado)) {
              <button type="button" class="btn btn-secundario" (click)="pedirReactivacion()">
                Reactivar
              </button>
            }
            @if (sePuedeSuspender(tenant.estado)) {
              <button type="button" class="btn btn-peligro" (click)="abrirSuspension(false)">
                Suspender
              </button>
            }
            @if (sePuedeDarDeBaja(tenant.estado)) {
              <button type="button" class="btn btn-peligro" (click)="abrirSuspension(true)">
                Dar de baja
              </button>
            }
          </div>
        </header>

        @if (tenant.motivo_suspension) {
          <p
            class="rounded border border-error bg-error-container px-3 py-2.5 text-body-sm text-on-error-container"
          >
            <strong>
              {{
                tenant.estado === 'baja_logica'
                  ? 'Motivo de la baja: '
                  : 'Motivo de la suspensión: '
              }}
            </strong>
            {{ tenant.motivo_suspension }}
          </p>
        }

        @if (sePuedeReenviar(tenant.estado)) {
          <div
            class="flex flex-wrap items-center justify-between gap-3 rounded border border-warning bg-warning-container px-3 py-2.5 text-on-warning-container"
          >
            <p class="max-w-prose text-body-sm">
              El entorno sigue <strong>pendiente</strong>: el administrador inicial no ha canjeado
              su enlace de activación. Nadie puede iniciar sesión todavía, y el enlace vence 24
              horas después de emitirse.
            </p>
            <!-- Única vía de rescate: la activación no pasa por el login y el
                 restablecimiento de contraseña exige una cuenta ya activa. -->
            <button
              type="button"
              class="btn btn-secundario"
              [disabled]="reenvio.isPending()"
              (click)="reenviar()"
            >
              <app-icon name="mail" [size]="16" />
              {{ reenvio.isPending() ? 'Reenviando…' : 'Reenviar enlace' }}
            </button>
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <section class="rounded border border-outline-variant bg-surface-container-lowest p-4">
            <p class="text-label-caps uppercase text-on-surface-variant">Plan comercial</p>
            <p class="mt-2 text-headline-md text-on-surface">{{ tenant.plan.nombre }}</p>
            <p class="mt-1 text-label-md text-on-surface-variant">
              <span class="font-mono">{{ tenant.plan.codigo }}</span> · techo de
              {{ tenant.plan.licencias_max }} licencias
            </p>
            @if (planRetirado()) {
              <p class="mt-1.5 text-label-md text-warning">Plan retirado del catálogo</p>
            }
          </section>

          <section class="rounded border border-outline-variant bg-surface-container-lowest p-4">
            <p class="text-label-caps uppercase text-on-surface-variant">Licencias</p>
            <div class="mt-2 flex items-baseline justify-between gap-2">
              <span class="text-headline-md text-on-surface">
                {{ tenant.usuarios.licencias_consumidas }}
              </span>
              <span class="text-label-md text-on-surface-variant">
                de {{ tenant.usuarios.licencias_max }} · {{ porcentaje() }}%
              </span>
            </div>
            <!-- La barra se topa en 100 porque no hay cómo dibujar más; el
                 excedente se dice con números, que es lo que sirve para decidir. -->
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                class="h-full rounded-full"
                [class]="colorBarra()"
                [style.width.%]="anchoBarra()"
              ></div>
            </div>
            @if (excedente() > 0) {
              <p class="mt-1.5 text-label-md text-error">
                {{ excedente() }}
                {{ excedente() === 1 ? 'licencia' : 'licencias' }} por encima del techo del plan.
              </p>
            } @else if (porcentaje() >= 90) {
              <p class="mt-1.5 text-label-md text-warning">Cerca del límite del plan.</p>
            }
            <p class="mt-2 text-label-md text-on-surface-variant">
              {{ tenant.usuarios.registrados }}
              {{ tenant.usuarios.registrados === 1 ? 'usuario' : 'usuarios' }} registrados en total
            </p>
          </section>

          <section class="rounded border border-outline-variant bg-surface-container-lowest p-4">
            <p class="text-label-caps uppercase text-on-surface-variant">Registro</p>
            <dl class="mt-2 flex flex-col gap-1.5 text-label-md">
              <div class="flex justify-between gap-3">
                <dt class="text-on-surface-variant">Alta</dt>
                <dd class="text-on-surface">{{ fechaHora(tenant.created_at) }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-on-surface-variant">Último cambio</dt>
                <dd class="text-on-surface">{{ fechaHora(tenant.updated_at) }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-on-surface-variant">ID</dt>
                <dd
                  class="truncate font-mono text-mono-sm text-on-surface-variant"
                  [attr.title]="tenant.id"
                >
                  {{ tenant.id }}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="rounded border border-outline-variant bg-surface-container-lowest">
          <header
            class="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-3"
          >
            <div>
              <h2 class="text-headline-sm text-on-surface">Módulos</h2>
              <p class="text-label-md text-on-surface-variant">
                {{ tenant.modulos_activos.length }} activos de
                {{ catalogo.modulosDelPlan(tenant.plan.codigo).length }} incluidos en el plan
              </p>
            </div>
            @if (sePuedeEditar(tenant.estado)) {
              <button type="button" class="btn btn-secundario" (click)="abrirModulos()">
                Gestionar módulos
              </button>
            }
          </header>

          <div class="flex flex-col gap-4 px-4 py-4">
            @for (fase of catalogo.fases(); track fase) {
              @if (activosDeFase(fase).length > 0 || inactivosDeFase(fase).length > 0) {
                <div>
                  <p class="mb-2 text-label-caps uppercase text-on-surface-variant">
                    {{ etiquetaFase(fase) }}
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (nombre of activosDeFase(fase); track nombre) {
                      <span
                        class="rounded bg-success-container px-2 py-1 text-label-md text-on-success-container"
                      >
                        {{ nombre }}
                      </span>
                    }
                    @for (nombre of inactivosDeFase(fase); track nombre) {
                      <span
                        class="rounded border border-outline-variant px-2 py-1 text-label-md text-on-surface-variant"
                        title="Incluido en el plan, sin activar"
                      >
                        {{ nombre }}
                      </span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </section>

        <p class="max-w-prose text-label-md text-on-surface-variant">
          Desde el portal de plataforma se administra el contrato de la organización: existencia,
          plan, módulos y estado. Los usuarios, los roles, la política de contraseñas y la bitácora
          los administra su propio TENANT_ADMIN — este portal no tiene acceso a esos datos.
        </p>
      }
    </div>

    @if (consulta.data(); as tenant) {
      @if (modalEditar()) {
        <app-editar-organizacion-modal
          [tenant]="tenant"
          [enviando]="edicion.isPending()"
          [error]="edicion.error()"
          (guardar)="editar($event)"
          (cerrar)="modalEditar.set(false)"
        />
      }

      @if (modalModulos()) {
        <app-modulos-modal
          [tenant]="tenant"
          [enviando]="modulos.isPending()"
          [error]="modulos.error()"
          (guardar)="guardarModulos($event)"
          (cerrar)="modalModulos.set(false)"
        />
      }

      @if (enSuspension(); as baja) {
        <app-suspender-modal
          [tenant]="tenant"
          [baja]="baja.baja"
          [usuariosAfectados]="tenant.usuarios.licencias_consumidas"
          [enviando]="suspension.isPending()"
          [error]="suspension.error()"
          (guardar)="suspender($event)"
          (cerrar)="enSuspension.set(null)"
        />
      }

      @if (confirmandoReactivacion()) {
        <app-confirmar-modal
          titulo="Reactivar organización"
          mensaje="El acceso vuelve a funcionar de inmediato y se limpia el motivo. Las sesiones cerradas no se restauran: sus usuarios tendrán que volver a entrar."
          [detalle]="tenant.razon_social + ' · ' + tenant.slug"
          etiquetaConfirmar="Reactivar"
          [enviando]="reactivacion.isPending()"
          [error]="errorReactivacion()"
          (confirmar)="reactivar()"
          (cancelar)="confirmandoReactivacion.set(false)"
        />
      }

      @if (enlace(); as emitido) {
        <app-enlace-activacion-modal
          [razonSocial]="tenant.razon_social"
          [slug]="tenant.slug"
          [correoDestino]="emitido.admin_inicial.correo"
          [nombreDestino]="emitido.admin_inicial.nombre_completo"
          [token]="emitido.activacion_token"
          [expiraEn]="emitido.expira_en"
          [esReenvio]="true"
          (cerrar)="enlace.set(null)"
        />
      }
    }
  `,
})
export class OrganizacionPage {
  private readonly api = inject(PlataformaApi);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);
  protected readonly catalogo = inject(CatalogoPlataforma);

  /** Llega del segmento de ruta gracias a `withComponentInputBinding`. */
  readonly id = input.required<string>();

  protected readonly modalEditar = signal(false);
  protected readonly modalModulos = signal(false);
  protected readonly enSuspension = signal<{ baja: boolean } | null>(null);
  protected readonly confirmandoReactivacion = signal(false);
  protected readonly enlace = signal<ReenvioActivacion | null>(null);

  protected readonly fechaHora = formatFechaHora;
  protected readonly fecha = formatFecha;
  protected readonly tono = tonoTenant;
  protected readonly etiquetaFase = etiquetaFase;
  protected readonly sePuedeEditar = puedeEditar;
  protected readonly sePuedeSuspender = puedeSuspender;
  protected readonly sePuedeDarDeBaja = puedeDarDeBaja;
  protected readonly sePuedeReactivar = puedeReactivar;
  protected readonly sePuedeReenviar = puedeReenviarActivacion;

  protected readonly consulta = injectQuery(() => ({
    queryKey: qkPlataforma.detalleTenant(this.id()),
    queryFn: () => this.api.detalleTenant(this.id()),
  }));

  protected readonly edicion = injectMutation(() => ({
    mutationFn: (cambios: TenantUpdate) => this.api.editarTenant(this.id(), cambios),
    onSuccess: () => {
      this.toasts.exito('Organización actualizada.');
      this.modalEditar.set(false);
      this.refrescar();
    },
  }));

  protected readonly modulos = injectMutation(() => ({
    mutationFn: (cambios: TenantUpdate) => this.api.editarTenant(this.id(), cambios),
    onSuccess: () => {
      this.toasts.exito('Módulos actualizados.');
      this.modalModulos.set(false);
      this.refrescar();
    },
  }));

  protected readonly suspension = injectMutation(() => ({
    mutationFn: (datos: SuspenderTenant) =>
      this.api.suspenderTenant(this.id(), datos, this.enSuspension()?.baja ?? false),
    onSuccess: (resultado) => {
      const baja = this.enSuspension()?.baja ?? false;
      const revocadas = resultado.sesiones_revocadas;
      this.toasts.exito(
        `${baja ? 'Organización dada de baja' : 'Organización suspendida'}. ` +
          `${revocadas} ${revocadas === 1 ? 'sesión cerrada' : 'sesiones cerradas'}.`,
      );
      this.enSuspension.set(null);
      this.refrescar();
    },
  }));

  protected readonly reactivacion = injectMutation(() => ({
    mutationFn: () => this.api.reactivarTenant(this.id()),
    onSuccess: () => {
      this.toasts.exito('La organización vuelve a estar activa.');
      this.confirmandoReactivacion.set(false);
      this.refrescar();
    },
  }));

  protected readonly reenvio = injectMutation(() => ({
    mutationFn: () => this.api.reenviarActivacion(this.id()),
    onSuccess: (respuesta: ReenvioActivacion) => {
      this.enlace.set(respuesta);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  private readonly detalle = computed<TenantDetalle | undefined>(() => this.consulta.data());

  protected readonly planRetirado = computed(() => {
    const plan = this.catalogo.plan(this.detalle()?.plan.codigo);
    return plan !== null && !plan.activo;
  });

  protected readonly porcentaje = computed(() => {
    const uso = this.detalle()?.usuarios;
    if (!uso || uso.licencias_max === 0) return 0;
    return Math.round((uso.licencias_consumidas / uso.licencias_max) * 100);
  });

  protected readonly excedente = computed(() => {
    const uso = this.detalle()?.usuarios;
    if (!uso) return 0;
    return uso.licencias_consumidas - uso.licencias_max;
  });

  protected readonly anchoBarra = computed(() => Math.min(100, this.porcentaje()));

  protected readonly colorBarra = computed(() => {
    const pct = this.porcentaje();
    if (pct >= 100) return 'bg-error';
    if (pct >= 90) return 'bg-warning';
    return 'bg-success';
  });

  /** Módulos activos de una fase, por nombre. */
  protected activosDeFase(fase: number): string[] {
    return (this.detalle()?.modulos_activos ?? [])
      .filter((modulo) => modulo.fase === fase)
      .map((modulo) => modulo.nombre);
  }

  /** Incluidos en el plan pero sin activar: se ven, apagados, para que el hueco
   *  no parezca una limitación del plan. */
  protected inactivosDeFase(fase: number): string[] {
    const tenant = this.detalle();
    if (!tenant) return [];

    const activos = tenant.modulos_activos.map((modulo) => modulo.codigo);
    return this.catalogo
      .modulosDelPlan(tenant.plan.codigo)
      .filter((codigo) => !activos.includes(codigo))
      .filter((codigo) => this.catalogo.modulo(codigo)?.fase === fase)
      .map((codigo) => this.catalogo.nombreModulo(codigo));
  }

  protected errorDetalle(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar la organización.');
  }

  protected errorReactivacion(): string {
    const error = this.reactivacion.error();
    return error ? mensajeDeError(error) : '';
  }

  protected etiquetaEstado(estado: TenantDetalle['estado']): string {
    return ESTADO_TENANT_LABEL[estado];
  }

  protected ayuda(estado: TenantDetalle['estado']): string {
    return ESTADO_TENANT_AYUDA[estado];
  }

  protected abrirEdicion(): void {
    this.edicion.reset();
    this.modalEditar.set(true);
  }

  protected editar(cambios: TenantUpdate): void {
    this.edicion.mutate(cambios);
  }

  protected abrirModulos(): void {
    this.modulos.reset();
    this.modalModulos.set(true);
  }

  protected guardarModulos(cambios: TenantUpdate): void {
    this.modulos.mutate(cambios);
  }

  protected abrirSuspension(baja: boolean): void {
    this.suspension.reset();
    this.enSuspension.set({ baja });
  }

  protected suspender(datos: SuspenderTenant): void {
    this.suspension.mutate(datos);
  }

  protected pedirReactivacion(): void {
    this.reactivacion.reset();
    this.confirmandoReactivacion.set(true);
  }

  protected reactivar(): void {
    this.reactivacion.mutate();
  }

  protected reenviar(): void {
    this.reenvio.mutate();
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({ queryKey: qkPlataforma.tenants() });
  }
}
