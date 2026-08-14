import { ModuloLayout } from '../../shared/ui/ModuloLayout';

/**
 * Las pestañas siguen el orden de la cadena comercial (FLUJO-VENTAS §1):
 * clientes, luego oportunidad → cotización → pedido → factura. Leerlas de
 * izquierda a derecha es leer el ciclo de venta.
 *
 * Frente a la maqueta de `main` hay una pestaña más, «Oportunidades»: allí el
 * pipeline y el listado eran la misma pantalla, pero son dos vistas distintas
 * del mismo dato — el kanban agregado por etapa y la tabla operable.
 */
const PESTANAS = [
  { segmento: 'clientes', label: 'Clientes' },
  { segmento: 'pipeline', label: 'Pipeline CRM' },
  { segmento: 'oportunidades', label: 'Oportunidades' },
  { segmento: 'cotizaciones', label: 'Cotizaciones' },
  { segmento: 'pedidos', label: 'Pedidos' },
  { segmento: 'facturas', label: 'Facturas' },
  { segmento: 'reportes', label: 'Reportes' },
];

export function VentasLayout() {
  return (
    <ModuloLayout
      titulo="Módulo de Ventas"
      descripcion="Ciclo comercial completo: oportunidad, cotización, pedido y factura."
      base="ventas"
      pestanas={PESTANAS}
    />
  );
}
