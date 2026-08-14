import { ModuloLayout } from '../../shared/ui/ModuloLayout';

/**
 * Las nueve vistas del módulo, en el orden en que se usan: primero consultar
 * (stock y su valuación), luego mantener los catálogos, y al final la operación
 * diaria.
 */
const PESTANAS = [
  { segmento: 'stock', label: 'Stock' },
  { segmento: 'valuacion', label: 'Valuación' },
  { segmento: 'productos', label: 'Productos' },
  { segmento: 'almacenes', label: 'Almacenes' },
  { segmento: 'kardex', label: 'Kardex' },
  { segmento: 'movimientos', label: 'Movimientos' },
  { segmento: 'transferencias', label: 'Transferencias' },
  { segmento: 'ajustes', label: 'Ajustes' },
  { segmento: 'alertas', label: 'Alertas' },
];

export function InventarioLayout() {
  return (
    <ModuloLayout
      titulo="Módulo de Inventario"
      descripcion="Control de existencias, almacenes, movimientos y kardex."
      base="inventario"
      pestanas={PESTANAS}
    />
  );
}
