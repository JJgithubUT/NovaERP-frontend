import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PagePlaceholderComponent } from '../../../shared/ui/page-placeholder/page-placeholder.component';

/**
 * TODO(Sprint 1): tabla paginada de clientes.
 *
 * Ojo con la baja: el backend la rechaza con 422 si el cliente tiene saldo en
 * cuentas por cobrar, y manda `saldo_pendiente` en el cuerpo del error. Ese
 * dato llega en `ApiError.extra['saldo_pendiente']` y hay que mostrarlo — es un
 * decimal string, formatéalo con `formatMoneda`.
 */
@Component({
  selector: 'app-clientes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      titulo="Clientes"
      descripcion="Catálogo de clientes: alta, edición parcial, búsqueda por razón social o RFC, y baja lógica con guarda de saldo pendiente en CxC."
      endpoint="GET·POST /api/ventas/clientes/ · PATCH·DELETE /api/ventas/clientes/{id}/"
      accion="Nuevo Cliente"
    />
  `,
})
export class ClientesPage {}
