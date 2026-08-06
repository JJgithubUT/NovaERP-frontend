import type { QueryClient } from '@tanstack/angular-query-experimental';
import { qk } from '../../core/query/query-keys';

/**
 * Recursos que quedan obsoletos en cuanto algo altera la existencia.
 *
 * Un movimiento, un ajuste o una transferencia no tocan una sola tabla: el
 * backend actualiza `stock_actual`, escribe en el kardex, recalcula la
 * valuación y puede disparar una alerta de stock mínimo. Refrescar solo la
 * pantalla desde la que se capturó dejaría las otras cinco mintiendo hasta que
 * el usuario navegara a ellas.
 */
const AFECTADOS = [
  'movimientos',
  'ajustes',
  'transferencias',
  'stock',
  'kardex',
  'valuacion',
  'alertas',
] as const;

/** Invalida todo lo que depende del stock tras una escritura de inventario. */
export function invalidarStock(queryClient: QueryClient, tenantSlug: string): void {
  for (const recurso of AFECTADOS) {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, recurso) });
  }
}
