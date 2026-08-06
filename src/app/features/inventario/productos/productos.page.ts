import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PagePlaceholderComponent } from '../../../shared/ui/page-placeholder/page-placeholder.component';

/**
 * TODO(Sprint 1): tabla paginada de productos.
 *
 * Al implementarla, cuidado con estos dos detalles del contrato:
 * - `costo_referencia`, `precio_venta` y `stock_minimo` son strings decimales.
 *   Formatéalos con `formatCantidad`/`formatMoneda`, nunca con `parseFloat`.
 * - El DELETE es baja lógica: la fila no desaparece, cambia a `activo: false`.
 */
@Component({
  selector: 'app-productos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      titulo="Productos"
      descripcion="Catálogo de productos: alta, edición parcial, búsqueda por SKU o nombre y baja lógica."
      endpoint="GET·POST /api/inventario/productos/ · PATCH·DELETE /api/inventario/productos/{id}/"
      accion="Nuevo Producto"
    />
  `,
})
export class ProductosPage {}
