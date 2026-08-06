import type { Modulo } from '../api/models';

export interface NavItem {
  label: string;
  /** Símbolo de Material. Debe estar en el subset (public/fonts/README.md). */
  icon: string;
  /**
   * Comando de router ya resuelto, con el tenant al frente y **un elemento por
   * segmento**: `['/', 'acme', 'inventario', 'productos']`.
   *
   * Lo de "un elemento por segmento" no es un detalle de estilo. Angular
   * codifica cada elemento del array como un único segmento de URL, así que un
   * `'inventario/productos'` de una pieza se convierte en
   * `inventario%2Fproductos` y el enlace deja de resolver.
   */
  link: readonly string[];
}

export interface NavGroup {
  /** `modulos[].codigo` de /api/core/me/. */
  codigo: string;
  label: string;
  items: readonly NavItem[];
}

interface RutaModulo {
  label: string;
  icon: string;
  /** Segmentos relativos al tenant. */
  segments: readonly string[];
}

/**
 * Qué pantallas tiene cada módulo.
 *
 * El backend dice **qué módulos** tiene el tenant; este mapa dice **qué rutas**
 * tiene cada módulo. Un módulo que el backend habilite pero que no esté aquí
 * simplemente no aparece en el sidebar: el menú no se puede adelantar a
 * pantallas que aún no existen.
 */
const RUTAS_POR_MODULO: Readonly<Record<string, readonly RutaModulo[]>> = {
  INVENTARIO: [
    { label: 'Productos', icon: 'inventory_2', segments: ['inventario', 'productos'] },
    { label: 'Almacenes', icon: 'warehouse', segments: ['inventario', 'almacenes'] },
  ],
  VENTAS: [{ label: 'Clientes', icon: 'group', segments: ['ventas', 'clientes'] }],
  COMPRAS: [{ label: 'Proveedores', icon: 'factory', segments: ['compras', 'proveedores'] }],
};

/**
 * Construye el sidebar cruzando los módulos del tenant con las rutas que la app
 * sabe pintar. La intersección es la clave: ni módulos sin pantallas, ni
 * pantallas sin módulo contratado.
 */
export function construirNavegacion(
  modulos: readonly Modulo[],
  tenantSlug: string | null,
): readonly NavGroup[] {
  if (!tenantSlug) return [];

  return modulos
    .map((modulo) => ({
      codigo: modulo.codigo,
      label: modulo.nombre,
      items: (RUTAS_POR_MODULO[modulo.codigo] ?? []).map((ruta) => ({
        label: ruta.label,
        icon: ruta.icon,
        link: ['/', tenantSlug, ...ruta.segments],
      })),
    }))
    .filter((grupo) => grupo.items.length > 0);
}
