import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PagePlaceholderComponent } from '../../../shared/ui/page-placeholder/page-placeholder.component';

/**
 * TODO(Sprint 1): tabla paginada de proveedores.
 *
 * A diferencia de Cliente, aquí `rfc_o_id_fiscal` es obligatorio (NOT NULL en
 * la DB): el formulario debe exigirlo.
 */
@Component({
  selector: 'app-proveedores-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      titulo="Proveedores"
      descripcion="Catálogo de proveedores: alta, edición parcial, búsqueda por razón social o RFC y baja lógica."
      endpoint="GET·POST /api/compras/proveedores/ · PATCH·DELETE /api/compras/proveedores/{id}/"
      accion="Nuevo Proveedor"
    />
  `,
})
export class ProveedoresPage {}
