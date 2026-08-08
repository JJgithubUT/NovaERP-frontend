/**
 * Pantallas de entrada: las que se ven **antes** de estar dentro del sistema.
 *
 * Todas fuerzan el tema claro, sin importar la preferencia guardada ni la del
 * sistema operativo. La razón es que en ese momento todavía no se sabe quién
 * está delante: la preferencia que hay en el navegador es la de la última
 * persona que lo usó, y aplicarla a un tercero es adivinar. El tema del usuario
 * se aplica al entrar, cuando ya hay identidad.
 *
 * Ojo: forzar aquí **no** cambia la preferencia guardada. Quien la tenía en
 * oscuro la recupera intacta al pasar del login al shell.
 *
 * Esta lista se duplica —a mano— en el script inline de `index.html`, que corre
 * antes de que Angular arranque y no puede importar de aquí. Si añades una ruta,
 * añádela también allí o esa pantalla parpadeará en oscuro antes de aclararse.
 */
export const RUTAS_ENTRADA: readonly string[] = [
  '/login',
  // Portal de plataforma (SysAdmin).
  '/admin/acceso',
  // Canje del enlace de alta de usuario y de organización.
  '/activar',
  '/activar-organizacion',
];

/**
 * ¿Esta URL es una pantalla de entrada?
 *
 * Recibe la URL tal como la da el router (`urlAfterRedirects`), así que hay que
 * quitarle query y fragmento: el canje llega como `/activar-organizacion?token=…`
 * y una comparación cruda no acertaría nunca.
 */
export function esRutaDeEntrada(url: string): boolean {
  const ruta = normalizar(url);
  return RUTAS_ENTRADA.some((entrada) => ruta === entrada);
}

function normalizar(url: string): string {
  const sinQuery = url.split('?')[0]?.split('#')[0] ?? '';
  // '/login/' y '/login' son la misma pantalla.
  return sinQuery.length > 1 && sinQuery.endsWith('/') ? sinQuery.slice(0, -1) : sinQuery;
}
