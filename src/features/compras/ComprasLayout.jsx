import { ModuloLayout } from '../../shared/ui/ModuloLayout';

/** El orden sigue la cadena de abastecimiento (FLUJO-COMPRAS §1). */
const PESTANAS = [
  { segmento: 'proveedores', label: 'Proveedores' },
  { segmento: 'ordenes', label: 'Órdenes' },
  { segmento: 'recepciones', label: 'Recepciones' },
  { segmento: 'cuentas-por-pagar', label: 'Cuentas por pagar' },
  { segmento: 'configuracion', label: 'Configuración' },
];

export function ComprasLayout() {
  return (
    <ModuloLayout
      titulo="Módulo de Compras"
      descripcion="Abastecimiento completo: proveedor, orden de compra, recepción y cuenta por pagar."
      base="compras"
      pestanas={PESTANAS}
    />
  );
}
