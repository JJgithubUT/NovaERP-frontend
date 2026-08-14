import { EntityCombo } from '../../shared/ui/EntityCombo';

/**
 * Filtros de producto y almacén que comparten Stock y Valuación.
 *
 * Ambas vistas consultan por `producto_id` / `almacen_id` (UUID), no por SKU ni
 * por nombre, así que el combo de búsqueda es la única forma razonable de
 * elegirlos: nadie teclea un UUID.
 *
 * @param {{
 *   producto: object | null,
 *   almacen: object | null,
 *   onProducto: (opcion: object | null) => void,
 *   onAlmacen: (opcion: object | null) => void,
 * }} props
 */
export function FiltrosStock({ producto, almacen, onProducto, onAlmacen }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <EntityCombo
        etiqueta="Producto"
        tipo="producto"
        valor={producto}
        onValor={onProducto}
        marcador="Todos · buscar por SKU o nombre…"
      />
      <EntityCombo
        etiqueta="Almacén"
        tipo="almacen"
        valor={almacen}
        onValor={onAlmacen}
        marcador="Todos · buscar almacén…"
      />
    </div>
  );
}
