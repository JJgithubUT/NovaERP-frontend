import type { Modulo } from '../api/models';

export interface NavItem {
  /** `modulos[].codigo` de /api/core/me/. */
  codigo: string;
  label: string;
  /** Símbolo de Material. Debe estar en el subset (public/fonts/README.md). */
  icon: string;
  /**
   * Comando de router ya resuelto, con el tenant al frente y **un elemento por
   * segmento**: `['/', 'acme', 'inventario']`.
   *
   * Lo de "un elemento por segmento" no es un detalle de estilo. Angular
   * codifica cada elemento del array como un único segmento de URL, así que un
   * `'inventario/productos'` de una pieza se convierte en
   * `inventario%2Fproductos` y el enlace deja de resolver.
   */
  link: readonly string[];
}

interface RutaModulo {
  icon: string;
  /** Segmento raíz del módulo, relativo al tenant. */
  segmento: string;
}

/**
 * Qué módulos sabe pintar la app, y con qué icono.
 *
 * El sidebar lista **módulos, no pantallas**: dentro de cada módulo son sus
 * pestañas las que llevan a cada sección (`/acme/inventario/kardex`). Repetir
 * las ocho vistas de Inventario aquí y otra vez en las pestañas sería el mismo
 * menú dos veces, y obligaría a mantenerlas sincronizadas a mano.
 *
 * El backend dice **qué módulos** tiene el tenant; este mapa dice cuáles de
 * esos tienen pantallas. Un módulo que el backend habilite pero que no esté
 * aquí no aparece: el menú no se puede adelantar a lo que aún no existe.
 */
const MODULOS: Readonly<Record<string, RutaModulo>> = {
  INVENTARIO: { icon: 'inventory_2', segmento: 'inventario' },
  VENTAS: { icon: 'shopping_cart', segmento: 'ventas' },
  COMPRAS: { icon: 'local_shipping', segmento: 'compras' },
};

/**
 * Construye el sidebar cruzando los módulos del tenant con los que la app sabe
 * pintar. La intersección es la clave: ni módulos sin pantallas, ni pantallas
 * sin módulo contratado.
 */
export function construirNavegacion(
  modulos: readonly Modulo[],
  tenantSlug: string | null,
): readonly NavItem[] {
  if (!tenantSlug) return [];

  return modulos.flatMap((modulo) => {
    const ruta = MODULOS[modulo.codigo];
    if (!ruta) return [];

    return [
      {
        codigo: modulo.codigo,
        label: modulo.nombre,
        icon: ruta.icon,
        link: ['/', tenantSlug, ruta.segmento],
      },
    ];
  });
}
