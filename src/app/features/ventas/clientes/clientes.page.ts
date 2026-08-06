import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type Cliente, type ClienteCreate } from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
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
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ClienteFormModal } from './cliente-form.modal';

/**
 * Catálogo de clientes (FLUJO-VENTAS §6).
 *
 * La baja es lógica y además condicionada: el backend la rechaza si quedan
 * cuentas por cobrar abiertas. Como en el resto de catálogos, tampoco hay
 * reactivación desde la API.
 */
@Component({
  selector: 'app-clientes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BuscadorComponent,
    ClienteFormModal,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Clientes</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            El RFC es único por empresa. El límite de crédito gobierna la confirmación de pedidos.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo cliente
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
              <th class="num">Límite crédito</th>
              <th>Estado</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="6">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="6" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (cliente of consulta.data()?.results ?? []; track cliente.id) {
                <tr>
                  <td class="font-medium">{{ cliente.razon_social }}</td>
                  <td class="clave tenue">{{ cliente.rfc_o_id_fiscal || '—' }}</td>
                  <td class="tenue">{{ cliente.correo || cliente.telefono || '—' }}</td>
                  <td class="num">{{ moneda(cliente.limite_credito) }}</td>
                  <td>
                    <app-badge [tono]="cliente.activo ? 'exito' : 'neutro'">
                      {{ cliente.activo ? 'Activo' : 'Inactivo' }}
                    </app-badge>
                  </td>
                  <td class="text-right">
                    <button type="button" class="btn-fila" (click)="abrirEdicion(cliente)">
                      <app-icon name="edit" [size]="14" />
                      Editar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  No hay clientes. Registra el primero con «Nuevo cliente».
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
      <app-cliente-form-modal
        [cliente]="enEdicion()"
        [enviando]="guardado.isPending() || baja.isPending()"
        [error]="guardado.error() ?? baja.error()"
        (guardar)="guardar($event)"
        (darDeBaja)="darDeBaja($event)"
        (cerrar)="cerrarModal()"
      />
    }
  `,
})
export class ClientesPage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Cliente | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
    };

    return {
      queryKey: qk.lista(slug, 'clientes', filtros),
      queryFn: () => this.api.listarClientes(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: ClienteCreate) => {
      const existente = this.enEdicion();
      return existente ? this.api.editarCliente(existente.id, datos) : this.api.crearCliente(datos);
    },
    onSuccess: () => {
      this.toasts.exito(this.enEdicion() ? 'Cliente actualizado.' : 'Cliente creado.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly baja = injectMutation(() => ({
    mutationFn: (cliente: Cliente) => this.api.darDeBajaCliente(cliente.id),
    onSuccess: () => {
      this.toasts.exito('Cliente dado de baja.');
      this.trasEscribir();
    },
    // Un 422 por saldo pendiente se queda en el modal: lo pinta con el importe.
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly moneda = formatMoneda;

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los clientes.');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.abrir();
  }

  protected abrirEdicion(cliente: Cliente): void {
    this.enEdicion.set(cliente);
    this.abrir();
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: ClienteCreate): void {
    this.guardado.mutate(datos);
  }

  protected darDeBaja(cliente: Cliente): void {
    this.baja.mutate(cliente);
  }

  private abrir(): void {
    this.guardado.reset();
    this.baja.reset();
    this.modalAbierto.set(true);
  }

  private trasEscribir(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'clientes') });
    this.cerrarModal();
  }

  private avisarSiEncolado(error: unknown): void {
    if (isApiError(error) && error.queued) {
      this.toasts.aviso(error.message);
      this.cerrarModal();
    }
  }
}
