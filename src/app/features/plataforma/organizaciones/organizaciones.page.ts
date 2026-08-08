import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type OrdenTenant,
  type ReenvioActivacion,
  type SuspenderTenant,
  type Tenant,
  type TenantCreado,
  type TenantCreate,
  type TenantEstado,
} from '../../../api/models';
import { PlataformaApi } from '../../../api/services/plataforma.api';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { CatalogoPlataforma } from '../../../core/plataforma/catalogo.store';
import { qkPlataforma } from '../../../core/plataforma/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { BuscadorComponent } from '../../../shared/ui/buscador/buscador.component';
import { ConfirmarModal } from '../../../shared/ui/confirmar/confirmar.modal';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatFecha } from '../../../shared/utils/fecha.util';
import {
  ESTADOS_TENANT,
  ESTADO_TENANT_AYUDA,
  ESTADO_TENANT_LABEL,
  puedeDarDeBaja,
  puedeReactivar,
  puedeReenviarActivacion,
  puedeSuspender,
  tonoTenant,
} from '../plataforma.labels';
import { EnlaceActivacionModal } from './enlace-activacion.modal';
import { OrganizacionFormModal } from './organizacion-form.modal';
import { SuspenderModal } from './suspender.modal';

/** Enlace de activación recién emitido, venga del alta o de un reenvío. */
interface EnlaceEmitido {
  razonSocial: string;
  slug: string;
  correo: string;
  nombre: string;
  token: string;
  expiraEn: string | null;
  esReenvio: boolean;
}

/**
 * Listado de organizaciones de la plataforma (RF-02).
 *
 * Los filtros son exactamente los que acepta el backend, incluido el orden: solo
 * admite cuatro campos, no un ORDER BY libre, así que únicamente esas columnas
 * llevan cabecera pulsable.
 *
 * **Editar y gestionar módulos no están aquí, sino en el detalle.** No es una
 * decisión de diseño visual: los dos diálogos necesitan el consumo de licencias y
 * los módulos activos para poder advertir de las consecuencias, y eso solo lo
 * devuelve el detalle. Ofrecerlos desde la fila significaría abrirlos sin poder
 * decir qué se rompe.
 *
 * Lo que sí se puede hacer desde la fila son los cambios de estado, que solo
 * necesitan la identidad de la organización. Suspender y dar de baja cierran
 * todas sus sesiones al instante, así que pasan por confirmación explícita con
 * motivo obligatorio.
 */
@Component({
  selector: 'app-organizaciones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BadgeComponent,
    BuscadorComponent,
    ConfirmarModal,
    EnlaceActivacionModal,
    FilaMensajeComponent,
    IconComponent,
    OrganizacionFormModal,
    PaginacionComponent,
    SuspenderModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-display-lg text-primary">Organizaciones</h1>
          <p class="mt-1 max-w-prose text-body-md text-on-surface-variant">
            Alta, plan, módulos y estado de los entornos de la plataforma.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nueva organización
        </button>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <app-buscador marcador="Razón social, dominio o ID…" (buscar)="buscar($event)" />

        <select
          class="campo-control sm:w-52"
          aria-label="Filtrar por estado"
          [value]="estado()"
          (change)="filtrarEstado($event)"
        >
          <option value="">Todos los estados</option>
          @for (opcion of estados; track opcion.valor) {
            <option [value]="opcion.valor">{{ opcion.label }}</option>
          }
        </select>

        <!-- Incluye los planes retirados: hay organizaciones contratadas en
             ellos y son las que más interesa poder aislar. -->
        <select
          class="campo-control sm:w-52"
          aria-label="Filtrar por plan"
          [value]="plan()"
          (change)="filtrarPlan($event)"
        >
          <option value="">Todos los planes</option>
          @for (opcion of catalogo.planes(); track opcion.codigo) {
            <option [value]="opcion.codigo">
              {{ opcion.nombre }}{{ opcion.activo ? '' : ' (retirado)' }}
            </option>
          }
        </select>

        <div class="flex items-end gap-2">
          <label class="flex flex-col gap-1.5">
            <span class="text-label-caps uppercase text-on-surface-variant">Alta desde</span>
            <input
              type="date"
              class="campo-control"
              [value]="desde()"
              (change)="filtrarDesde($event)"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-label-caps uppercase text-on-surface-variant">hasta</span>
            <input
              type="date"
              class="campo-control"
              [value]="hasta()"
              (change)="filtrarHasta($event)"
            />
          </label>
        </div>

        @if (hayFiltros()) {
          <button type="button" class="btn btn-secundario" (click)="limpiarFiltros()">
            Limpiar
          </button>
        }
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  (click)="ordenarPor('razon_social')"
                >
                  Organización {{ flecha('razon_social') }}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  (click)="ordenarPor('plan')"
                >
                  Plan {{ flecha('plan') }}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  (click)="ordenarPor('estado')"
                >
                  Estado {{ flecha('estado') }}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  (click)="ordenarPor('created_at')"
                >
                  Alta {{ flecha('created_at') }}
                </button>
              </th>
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
              @for (tenant of consulta.data()?.results ?? []; track tenant.id) {
                <tr>
                  <td>
                    <a
                      [routerLink]="['/admin/organizaciones', tenant.id]"
                      class="font-medium text-on-surface hover:text-action hover:underline"
                    >
                      {{ tenant.razon_social }}
                    </a>
                    <p class="tenue mt-0.5 text-label-md">
                      <span class="clave">{{ tenant.slug }}</span>
                      @if (tenant.dominio_comercial) {
                        · {{ tenant.dominio_comercial }}
                      }
                    </p>
                  </td>
                  <td>
                    <span class="text-on-surface">{{ tenant.plan.nombre }}</span>
                    <p class="tenue text-label-md">
                      hasta {{ tenant.plan.licencias_max }} licencias
                    </p>
                  </td>
                  <td>
                    <app-badge [tono]="tono(tenant.estado)" [attr.title]="ayuda(tenant.estado)">
                      {{ etiquetaEstado(tenant.estado) }}
                    </app-badge>
                    @if (tenant.motivo_suspension) {
                      <p
                        class="tenue mt-1 max-w-64 truncate text-label-md"
                        [attr.title]="tenant.motivo_suspension"
                      >
                        {{ tenant.motivo_suspension }}
                      </p>
                    }
                  </td>
                  <td class="tenue whitespace-nowrap">{{ fecha(tenant.created_at) }}</td>
                  <td>
                    <div class="flex flex-wrap justify-end gap-1.5">
                      <a class="btn-fila" [routerLink]="['/admin/organizaciones', tenant.id]">
                        Ver
                      </a>

                      @if (sePuedeReenviar(tenant.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="reenvio.isPending()"
                          (click)="reenviar(tenant)"
                        >
                          <app-icon name="mail" [size]="14" />
                          Reenviar enlace
                        </button>
                      }

                      @if (sePuedeReactivar(tenant.estado)) {
                        <button type="button" class="btn-fila" (click)="pedirReactivacion(tenant)">
                          Reactivar
                        </button>
                      }

                      @if (sePuedeSuspender(tenant.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          (click)="abrirSuspension(tenant, false)"
                        >
                          Suspender
                        </button>
                      }

                      @if (sePuedeDarDeBaja(tenant.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          (click)="abrirSuspension(tenant, true)"
                        >
                          Dar de baja
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="5">
                  {{
                    mensajeVacio()
                  }}
                </tr>
              }
            }
          </tbody>
        </table>

        <app-paginacion
          [page]="pagina()"
          [count]="consulta.data()?.count ?? 0"
          [numPages]="consulta.data()?.num_pages ?? 1"
          (pageChange)="pagina.set($event)"
        />
      </div>
    </div>

    @if (modalAlta()) {
      <app-organizacion-form-modal
        [enviando]="alta.isPending()"
        [error]="alta.error()"
        (guardar)="crear($event)"
        (cerrar)="modalAlta.set(false)"
      />
    }

    @if (enSuspension(); as pendiente) {
      <app-suspender-modal
        [tenant]="pendiente.tenant"
        [baja]="pendiente.baja"
        [enviando]="suspension.isPending()"
        [error]="suspension.error()"
        (guardar)="suspender($event)"
        (cerrar)="enSuspension.set(null)"
      />
    }

    @if (enReactivacion(); as tenant) {
      <app-confirmar-modal
        titulo="Reactivar organización"
        mensaje="El acceso vuelve a funcionar de inmediato y se limpia el motivo. Las sesiones cerradas no se restauran: sus usuarios tendrán que volver a entrar."
        [detalle]="tenant.razon_social + ' · ' + tenant.slug"
        etiquetaConfirmar="Reactivar"
        [enviando]="reactivacion.isPending()"
        [error]="errorReactivacion()"
        (confirmar)="reactivar(tenant)"
        (cancelar)="enReactivacion.set(null)"
      />
    }

    @if (enlace(); as emitido) {
      <app-enlace-activacion-modal
        [razonSocial]="emitido.razonSocial"
        [slug]="emitido.slug"
        [correoDestino]="emitido.correo"
        [nombreDestino]="emitido.nombre"
        [token]="emitido.token"
        [expiraEn]="emitido.expiraEn"
        [esReenvio]="emitido.esReenvio"
        (cerrar)="enlace.set(null)"
      />
    }
  `,
})
export class OrganizacionesPage {
  private readonly api = inject(PlataformaApi);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);
  protected readonly catalogo = inject(CatalogoPlataforma);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly estado = signal<TenantEstado | ''>('');
  protected readonly plan = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly orden = signal<OrdenTenant>('razon_social');
  protected readonly descendente = signal(false);

  protected readonly modalAlta = signal(false);
  protected readonly enSuspension = signal<{ tenant: Tenant; baja: boolean } | null>(null);
  protected readonly enReactivacion = signal<Tenant | null>(null);
  protected readonly enlace = signal<EnlaceEmitido | null>(null);

  protected readonly estados = ESTADOS_TENANT;
  protected readonly fecha = formatFecha;
  protected readonly tono = tonoTenant;
  protected readonly sePuedeSuspender = puedeSuspender;
  protected readonly sePuedeDarDeBaja = puedeDarDeBaja;
  protected readonly sePuedeReactivar = puedeReactivar;
  protected readonly sePuedeReenviar = puedeReenviarActivacion;

  private readonly filtros = computed(() => ({
    page: this.pagina(),
    page_size: PAGE_SIZE_DEFAULT,
    search: this.busqueda(),
    estado: this.estado() || undefined,
    plan: this.plan() || undefined,
    desde: this.desde() || undefined,
    hasta: this.hasta() || undefined,
    orden: this.orden(),
    // Solo viaja cuando está activo: `desc=false` no significa nada para el
    // backend y solo ensuciaría la clave de caché.
    desc: this.descendente() ? true : undefined,
  }));

  protected readonly consulta = injectQuery(() => {
    const filtros = this.filtros();
    return {
      queryKey: qkPlataforma.listaTenants(filtros),
      queryFn: () => this.api.listarTenants(filtros),
    };
  });

  protected readonly alta = injectMutation(() => ({
    mutationFn: (datos: TenantCreate) => this.api.crearTenant(datos),
    onSuccess: (creado: TenantCreado) => {
      this.modalAlta.set(false);
      // El token solo existe en claro en esta respuesta: se enseña de inmediato.
      this.enlace.set({
        razonSocial: creado.razon_social,
        slug: creado.slug,
        correo: creado.admin_inicial.correo,
        nombre: creado.admin_inicial.nombre_completo,
        token: creado.activacion_token,
        expiraEn: null,
        esReenvio: false,
      });
      this.refrescar();
    },
  }));

  protected readonly reenvio = injectMutation(() => ({
    mutationFn: (tenant: Tenant) =>
      this.api.reenviarActivacion(tenant.id).then((respuesta) => ({ tenant, respuesta })),
    onSuccess: ({ tenant, respuesta }: { tenant: Tenant; respuesta: ReenvioActivacion }) => {
      this.enlace.set({
        razonSocial: tenant.razon_social,
        slug: tenant.slug,
        correo: respuesta.admin_inicial.correo,
        nombre: respuesta.admin_inicial.nombre_completo,
        token: respuesta.activacion_token,
        expiraEn: respuesta.expira_en,
        esReenvio: true,
      });
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly suspension = injectMutation(() => ({
    mutationFn: (datos: SuspenderTenant) => {
      const pendiente = this.enSuspension();
      if (!pendiente) throw new Error('No hay organización seleccionada.');
      return this.api.suspenderTenant(pendiente.tenant.id, datos, pendiente.baja);
    },
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
    mutationFn: (tenant: Tenant) => this.api.reactivarTenant(tenant.id),
    onSuccess: (tenant) => {
      this.toasts.exito(`${tenant.razon_social} vuelve a estar activa.`);
      this.enReactivacion.set(null);
      this.refrescar();
    },
  }));

  protected readonly hayFiltros = computed(
    () =>
      this.busqueda() !== '' ||
      this.estado() !== '' ||
      this.plan() !== '' ||
      this.desde() !== '' ||
      this.hasta() !== '',
  );

  /** El backend redacta el mensaje de «sin resultados»; se muestra tal cual. */
  protected mensajeVacio(): string {
    return (
      this.consulta.data()?.mensaje ??
      'No se encontraron organizaciones para los criterios seleccionados.'
    );
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el listado.');
  }

  protected errorReactivacion(): string {
    const error = this.reactivacion.error();
    return error ? mensajeDeError(error) : '';
  }

  protected etiquetaEstado(estado: TenantEstado): string {
    return ESTADO_TENANT_LABEL[estado];
  }

  protected ayuda(estado: TenantEstado): string {
    return ESTADO_TENANT_AYUDA[estado];
  }

  protected flecha(campo: OrdenTenant): string {
    if (this.orden() !== campo) return '';
    return this.descendente() ? '▼' : '▲';
  }

  protected ordenarPor(campo: OrdenTenant): void {
    if (this.orden() === campo) {
      this.descendente.update((valor) => !valor);
    } else {
      this.orden.set(campo);
      this.descendente.set(false);
    }
    this.pagina.set(1);
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as TenantEstado | '');
    this.pagina.set(1);
  }

  protected filtrarPlan(evento: Event): void {
    this.plan.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected filtrarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  protected filtrarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.estado.set('');
    this.plan.set('');
    this.desde.set('');
    this.hasta.set('');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.alta.reset();
    this.modalAlta.set(true);
  }

  protected crear(datos: TenantCreate): void {
    this.alta.mutate(datos);
  }

  protected abrirSuspension(tenant: Tenant, baja: boolean): void {
    this.suspension.reset();
    this.enSuspension.set({ tenant, baja });
  }

  protected suspender(datos: SuspenderTenant): void {
    this.suspension.mutate(datos);
  }

  protected pedirReactivacion(tenant: Tenant): void {
    this.reactivacion.reset();
    this.enReactivacion.set(tenant);
  }

  protected reactivar(tenant: Tenant): void {
    this.reactivacion.mutate(tenant);
  }

  protected reenviar(tenant: Tenant): void {
    this.reenvio.mutate(tenant);
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({ queryKey: qkPlataforma.tenants() });
  }
}
