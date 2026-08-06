import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type Almacen, type AlmacenCreate } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
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
import { AlmacenFormModal } from './almacen-form.modal';

/** Catálogo de almacenes (FLUJO-INVENTARIO §2). La baja es lógica, como en productos. */
@Component({
  selector: 'app-almacenes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlmacenFormModal,
    BadgeComponent,
    BuscadorComponent,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Almacenes</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Cada almacén lleva su propio stock. El nombre es único por empresa.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo almacén
        </button>
      </div>

      <app-buscador marcador="Buscar por nombre…" (buscar)="buscar($event)" />

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="4">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="4" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (almacen of consulta.data()?.results ?? []; track almacen.id) {
                <tr>
                  <td class="font-medium">{{ almacen.nombre }}</td>
                  <td class="tenue">{{ almacen.ubicacion || '—' }}</td>
                  <td>
                    <app-badge [tono]="almacen.activo ? 'exito' : 'neutro'">
                      {{ almacen.activo ? 'Activo' : 'Inactivo' }}
                    </app-badge>
                  </td>
                  <td class="text-right">
                    <button type="button" class="btn-fila" (click)="abrirEdicion(almacen)">
                      <app-icon name="edit" [size]="14" />
                      Editar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="4">
                  No hay almacenes. Registra el primero con «Nuevo almacén».
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
      <app-almacen-form-modal
        [almacen]="enEdicion()"
        [enviando]="guardado.isPending() || baja.isPending()"
        [error]="guardado.error() ?? baja.error()"
        (guardar)="guardar($event)"
        (darDeBaja)="darDeBaja($event)"
        (cerrar)="cerrarModal()"
      />
    }
  `,
})
export class AlmacenesPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Almacen | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
    };

    return {
      queryKey: qk.lista(slug, 'almacenes', filtros),
      queryFn: () => this.api.listarAlmacenes(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: AlmacenCreate) => {
      const existente = this.enEdicion();
      return existente ? this.api.editarAlmacen(existente.id, datos) : this.api.crearAlmacen(datos);
    },
    onSuccess: () => {
      this.toasts.exito(this.enEdicion() ? 'Almacén actualizado.' : 'Almacén creado.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly baja = injectMutation(() => ({
    mutationFn: (almacen: Almacen) => this.api.darDeBajaAlmacen(almacen.id),
    onSuccess: () => {
      this.toasts.exito('Almacén dado de baja.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los almacenes.');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.abrir();
  }

  protected abrirEdicion(almacen: Almacen): void {
    this.enEdicion.set(almacen);
    this.abrir();
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: AlmacenCreate): void {
    this.guardado.mutate(datos);
  }

  protected darDeBaja(almacen: Almacen): void {
    this.baja.mutate(almacen);
  }

  private abrir(): void {
    this.guardado.reset();
    this.baja.reset();
    this.modalAbierto.set(true);
  }

  /**
   * Además del catálogo, se invalidan stock y kardex: ambas vistas identifican
   * el almacén por su **nombre**, no por su id, así que renombrarlo cambia lo
   * que muestran.
   */
  private trasEscribir(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'almacenes') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'stock') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'kardex') });
    this.cerrarModal();
  }

  private avisarSiEncolado(error: unknown): void {
    if (isApiError(error) && error.queued) {
      this.toasts.aviso(error.message);
      this.cerrarModal();
    }
  }
}
