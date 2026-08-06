import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PagePlaceholderComponent } from '../../../shared/ui/page-placeholder/page-placeholder.component';

/** TODO(Sprint 1): tabla paginada de almacenes. */
@Component({
  selector: 'app-almacenes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      titulo="Almacenes"
      descripcion="Catálogo de almacenes: alta, edición parcial, búsqueda por nombre y baja lógica."
      endpoint="GET·POST /api/inventario/almacenes/ · PATCH·DELETE /api/inventario/almacenes/{id}/"
      accion="Nuevo Almacén"
    />
  `,
})
export class AlmacenesPage {}
