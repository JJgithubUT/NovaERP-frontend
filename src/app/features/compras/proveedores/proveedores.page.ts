import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type Proveedor, type ProveedorCreate } from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { BuscadorComponent } from '../../../shared/ui/buscador/buscador.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { HistorialProveedorModal } from './historial-proveedor.modal';
import { ProveedorFormModal } from './proveedor-form.modal';

/**
 * Catálogo de proveedores (FLUJO-COMPRAS §2).
 *
 * La baja es lógica e **incondicional**: al contrario que el cliente, no se
 * bloquea por deuda pendiente. Las órdenes y cuentas por pagar del proveedor
 * sobreviven a la baja.
 */
@Component({
  selector: 'app-proveedores-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BuscadorComponent,
    FilaMensajeComponent,
    HistorialProveedorModal,
    IconComponent,
    PaginacionComponent,
    ProveedorFormModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Proveedores</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            El RFC es obligatorio y único por empresa.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo proveedor
        </button>
      </div>

      <app-buscador marcador="Buscar por razón social o RFC…" (buscar)="buscar($event)" />

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RFC</th>
              <th>Contacto</th>
              <th>Estado</th>
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
              @for (proveedor of consulta.data()?.results ?? []; track proveedor.id) {
                <tr>
                  <td class="font-medium">{{ proveedor.razon_social }}</td>
                  <td class="clave tenue">{{ proveedor.rfc_o_id_fiscal }}</td>
                  <td class="tenue">{{ proveedor.correo || proveedor.telefono || '—' }}</td>
                  <td>
                    <app-badge [tono]="proveedor.activo ? 'exito' : 'neutro'">
                      {{ proveedor.activo ? 'Activo' : 'Inactivo' }}
                    </app-badge>
                  </td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      <button type="button" class="btn-fila" (click)="verHistorial(proveedor)">
                        <app-icon name="history" [size]="14" />
                        Historial
                      </button>
                      <button type="button" class="btn-fila" (click)="abrirEdicion(proveedor)">
                        <app-icon name="edit" [size]="14" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="5">
                  No hay proveedores. Registra el primero con «Nuevo proveedor».
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

    @if (modalAbierto()) {
      <app-proveedor-form-modal
        [proveedor]="enEdicion()"
        [enviando]="guardado.isPending() || baja.isPending()"
        [error]="guardado.error() ?? baja.error()"
        (guardar)="guardar($event)"
        (darDeBaja)="darDeBaja($event)"
        (cerrar)="cerrarModal()"
      />
    }

    @if (enHistorial(); as proveedor) {
      <app-historial-proveedor-modal [proveedor]="proveedor" (cerrar)="enHistorial.set(null)" />
    }
  `,
})
export class ProveedoresPage {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Proveedor | null>(null);
  protected readonly enHistorial = signal<Proveedor | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
    };

    return {
      queryKey: qk.lista(slug, 'proveedores', filtros),
      queryFn: () => this.api.listarProveedores(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: ProveedorCreate) => {
      const existente = this.enEdicion();
      return existente
        ? this.api.editarProveedor(existente.id, datos)
        : this.api.crearProveedor(datos);
    },
    onSuccess: () => {
      this.toasts.exito(this.enEdicion() ? 'Proveedor actualizado.' : 'Proveedor creado.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly baja = injectMutation(() => ({
    mutationFn: (proveedor: Proveedor) => this.api.darDeBajaProveedor(proveedor.id),
    onSuccess: () => {
      this.toasts.exito('Proveedor dado de baja.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los proveedores.');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.abrir();
  }

  protected abrirEdicion(proveedor: Proveedor): void {
    this.enEdicion.set(proveedor);
    this.abrir();
  }

  protected verHistorial(proveedor: Proveedor): void {
    this.enHistorial.set(proveedor);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: ProveedorCreate): void {
    this.guardado.mutate(datos);
  }

  protected darDeBaja(proveedor: Proveedor): void {
    this.baja.mutate(proveedor);
  }

  private abrir(): void {
    this.guardado.reset();
    this.baja.reset();
    this.modalAbierto.set(true);
  }

  private trasEscribir(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'proveedores') });
    this.cerrarModal();
  }

  private avisarSiEncolado(error: unknown): void {
    if (isApiError(error) && error.queued) {
      this.toasts.aviso(error.message);
      this.cerrarModal();
    }
  }
}
