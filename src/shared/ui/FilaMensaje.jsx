/**
 * Fila que ocupa la tabla entera para decir "cargando", "sin datos" o "falló".
 *
 * Devuelve un `<tr>` real y no un envoltorio propio: el navegador solo admite
 * `<tr>` como hijo de `<tbody>`, y cualquier elemento de por medio lo saca de
 * la tabla y descuadra las columnas.
 *
 * @param {{
 *   columnas: number,
 *   tono?: 'tenue' | 'error',
 *   children: React.ReactNode,
 * }} props
 */
export function FilaMensaje({ columnas, tono = 'tenue', children }) {
  return (
    <tr>
      <td
        colSpan={columnas}
        className={`px-3 py-8 text-center text-body-sm ${
          tono === 'error' ? 'text-error' : 'text-on-surface-variant'
        }`}
      >
        {children}
      </td>
    </tr>
  );
}

/**
 * Las filas de estado de un listado, en un solo sitio.
 *
 * Existe porque el juego «cargando / sin conexión / error / vacío» se repite en
 * las ~20 tablas de la aplicación, y escribirlo suelto en cada una es como
 * acaban divergiendo los mensajes.
 *
 * Devuelve `null` cuando hay datos, para que la tabla pinte sus filas.
 *
 * @param {{
 *   columnas: number,
 *   cargando: boolean,
 *   pausado?: boolean,
 *   error: unknown,
 *   vacio: boolean,
 *   mensajeVacio?: string,
 * }} props
 */
export function EstadoTabla({
  columnas,
  cargando,
  pausado = false,
  error,
  vacio,
  mensajeVacio = 'Sin registros.',
}) {
  /*
   * `pausado` va ANTES que `cargando`, y no es un detalle.
   *
   * Cuando no hay forma de llegar al backend, TanStack Query deja la consulta
   * en `fetchStatus: 'paused'` y `isPending` se queda en `true` para siempre.
   * Sin este caso, la tabla se queda en «Cargando…» indefinidamente y el
   * usuario no tiene manera de saber que el servidor está caído — que es
   * exactamente lo que va a pasar cuando la computadora de la red esté
   * apagada.
   */
  if (pausado) {
    return (
      <FilaMensaje columnas={columnas} tono="error">
        Sin conexión con el servidor. Se reintentará al recuperarla.
      </FilaMensaje>
    );
  }

  if (cargando) {
    return <FilaMensaje columnas={columnas}>Cargando…</FilaMensaje>;
  }

  if (error) {
    return (
      <FilaMensaje columnas={columnas} tono="error">
        {mensajeDe(error)}
      </FilaMensaje>
    );
  }

  if (vacio) {
    return <FilaMensaje columnas={columnas}>{mensajeVacio}</FilaMensaje>;
  }

  return null;
}

/** @param {unknown} error */
function mensajeDe(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(/** @type {{ message: unknown }} */ (error).message);
  }
  return 'No se pudo cargar la información.';
}
