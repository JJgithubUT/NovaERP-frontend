import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type RecepcionCreate } from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Big, formatCantidad, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectCatalogoNombres } from '../../inventario/catalogo-nombres';
import { invalidarStock } from '../../inventario/invalidar-stock';
import { RecepcionFormModal } from './recepcion-form.modal';

/**
 * Recepciones de mercancía (FLUJO-COMPRAS §4).
 *
 * No hay editar ni eliminar, y no falta nada: una recepción ya sumó stock y
 * creó deuda. Corregirla sería reescribir el kardex, que es append-only — la
 * corrección va por un ajuste de inventario.
 *
 * Registrar una invalida medio sistema: el stock y el kardex de Inventario, la
 * orden que avanza de estado, y las cuentas por pagar donde aparece la deuda
 * nueva.
 */
@Component({
  selector: 'app-recepciones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilaMensajeComponent, IconComponent, PaginacionComponent, RecepcionFormModal],
  template: `
    <div class="flex flex-col gap-5">
      <div
        class="flex items-start gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"
      >
        <span>
          <strong class="font-semibold text-on-surface">Suma stock y genera deuda:</strong>
          cada recepción registra una entrada en inventario y crea la cuenta por pagar. No se puede
          deshacer.
        </span>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Recepciones</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Mercancía recibida contra órdenes de compra aprobadas.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrir()">
          <app-icon name="add" [size]="18" />
          Registrar recepción
        </button>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Almacén</th>
              <th class="num">Líneas</th>
              <th class="num">Unidades</th>
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
              @for (recepcion of consulta.data()?.results ?? []; track recepcion.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(recepcion.created_at) }}
                  </td>
                  <td>{{ nombres.almacen(recepcion.almacen_id) }}</td>
                  <td class="num tenue">{{ recepcion.lineas.length }}</td>
                  <td class="num font-semibold">{{ unidades(recepcion.lineas) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="4">
                  Sin recepciones registradas. Recibe contra una orden aprobada.
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
      <app-recepcion-form-modal
        [enviando]="registro.isPending()"
        [error]="registro.error()"
        (guardar)="registrar($event)"
        (cerrar)="modalAbierto.set(false)"
      />
    }
  `,
})
export class RecepcionesPage {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectCatalogoNombres();

  protected readonly pagina = signal(1);
  protected readonly modalAbierto = signal(false);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { page: this.pagina(), page_size: PAGE_SIZE_DEFAULT };

    return {
      queryKey: qk.lista(slug, 'recepciones', filtros),
      queryFn: () => this.api.listarRecepciones(filtros),
    };
  });

  protected readonly registro = injectMutation(() => ({
    mutationFn: (datos: RecepcionCreate) => this.api.crearRecepcion(datos),
    onSuccess: () => {
      this.toasts.exito('Recepción registrada: stock actualizado y cuenta por pagar creada.');
      this.refrescar();
      this.modalAbierto.set(false);
    },
  }));

  protected readonly fechaHora = formatFechaHora;

  /** Total de unidades de la recepción, para dimensionarla de un vistazo. */
  protected unidades(lineas: readonly { cantidad: string }[]): string {
    return formatCantidad(
      lineas.reduce((suma, linea) => suma.plus(toDecimal(linea.cantidad)), new Big(0)).toString(),
    );
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las recepciones.');
  }

  protected abrir(): void {
    this.registro.reset();
    this.modalAbierto.set(true);
  }

  protected registrar(datos: RecepcionCreate): void {
    this.registro.mutate(datos);
  }

  /**
   * Una recepción toca tres módulos a la vez: mueve inventario, avanza la orden
   * y crea la deuda. Las tres cachés quedan obsoletas en el mismo instante.
   */
  private refrescar(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'recepciones') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'ordenes-compra') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'cuentas-por-pagar') });
    invalidarStock(this.queryClient, slug);
  }
}
