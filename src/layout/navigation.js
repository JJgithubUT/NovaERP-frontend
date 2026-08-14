import { LayoutGrid, Package, ShoppingCart, Truck, Users, UserCircle } from 'lucide-react';
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
 *
 * Los iconos son de `lucide-react`, como en `main`. La rama Angular usaba
 * Material Symbols por fuente; traerlos habría significado cargar la fuente y
 * cambiar el aspecto de todos los iconos de la aplicación.
 */
const MODULOS = {
  INVENTARIO: { icon: Package, segmento: 'inventario' },
  VENTAS: { icon: ShoppingCart, segmento: 'ventas' },
  COMPRAS: { icon: Truck, segmento: 'compras' },
};
/**
 * Construye el sidebar cruzando los módulos del tenant con los que la app sabe
 * pintar. La intersección es la clave: ni módulos sin pantallas, ni pantallas
 * sin módulo contratado.
 */
export function construirNavegacion(modulos, tenantSlug) {
  if (!tenantSlug) return [];
  return modulos.flatMap((modulo) => {
    const ruta = MODULOS[modulo.codigo];
    if (!ruta) return [];
    return [
      {
        codigo: modulo.codigo,
        label: modulo.nombre,
        icon: ruta.icon,
        link: `/${tenantSlug}/${ruta.segmento}`,
      },
    ];
  });
}
/** Inicio no depende de ningún módulo: es la portada del tenant. */
export function itemInicio(tenantSlug) {
  if (!tenantSlug) return null;
  return {
    codigo: 'INICIO',
    label: 'Inicio',
    icon: LayoutGrid,
    link: `/${tenantSlug}`,
  };
}
/**
 * Entradas que no vienen de un módulo contratado.
 *
 * «Mi cuenta» la ve todo el mundo: el perfil y las sesiones propias son
 * autoservicio y no dependen de ningún permiso (FLUJO-USUARIOS §5).
 * «Administración» solo aparece para quien pueda leer el directorio, que es la
 * puerta de entrada del resto de pantallas de admin.
 *
 * Van aparte de `construirNavegacion` porque su condición no es tener un
 * módulo: mezclarlas ahí obligaría a inventar módulos falsos para que salieran.
 */
export function construirNavegacionSistema(tenantSlug, puedeAdministrar) {
  if (!tenantSlug) return [];
  const items = [
    {
      codigo: 'CUENTA',
      label: 'Mi cuenta',
      icon: UserCircle,
      link: `/${tenantSlug}/cuenta`,
    },
  ];
  if (puedeAdministrar) {
    items.push({
      codigo: 'ADMINISTRACION',
      label: 'Administración',
      icon: Users,
      link: `/${tenantSlug}/administracion`,
    });
  }
  return items;
}
