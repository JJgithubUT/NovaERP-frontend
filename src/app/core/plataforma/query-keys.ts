/**
 * Claves de caché del portal de plataforma.
 *
 * Es una fábrica aparte de `qk` a propósito. La invariante de aquélla es que
 * **toda** clave empieza por el slug del tenant, y de ahí saca su garantía: al
 * cambiar de tenant, nada de la caché anterior puede reutilizarse por
 * construcción. Los datos de plataforma son cross-tenant y no tienen slug que
 * poner delante; forzarlos dentro de `qk` rompería esa invariante para todos.
 *
 * El prefijo `plataforma` cumple aquí el mismo papel: `PlataformaService.salir`
 * limpia el `QueryClient` entero, y mientras tanto ninguna clave de tenant
 * puede colisionar con una de éstas.
 */

type ListaQuery = object;

const RAIZ = 'plataforma';

export const qkPlataforma = {
  raiz: () => [RAIZ] as const,

  me: () => [RAIZ, 'me'] as const,

  /** Catálogo maestro: planes, módulos y dependencias. */
  catalogos: () => [RAIZ, 'catalogos'] as const,

  /** Prefijo de todo lo de organizaciones: invalidarlo arrastra listas y detalles. */
  tenants: () => [RAIZ, 'tenants'] as const,

  listaTenants: (params: ListaQuery = {}) =>
    [RAIZ, 'tenants', 'lista', normalizar(params)] as const,

  detalleTenant: (id: string) => [RAIZ, 'tenants', 'detalle', id] as const,
} as const;

/** Dos búsquedas equivalentes comparten entrada: `{page:1}` y `{page:1,search:''}`. */
function normalizar(params: ListaQuery): Record<string, unknown> {
  const entradas = Object.entries(params)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '' && valor !== false)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entradas);
}
