import { HttpParams } from '@angular/common/http';

/**
 * Convierte un objeto de filtros en `HttpParams`, descartando lo vacío.
 *
 * Lo de descartar no es cosmético. Los filtros de la UI arrancan como `''`
 * (un `<select>` en "Todos", una caja de búsqueda intacta), y mandar
 * `?tipo=&sku=` no es lo mismo que no mandarlos: el backend compara por
 * igualdad y devolvería cero filas. Aquí se caen `undefined`, `null` y `''`,
 * que es justo lo que la UI usa para decir "sin filtro".
 *
 * El `false` sí se conserva: en `?notificada=false` es un valor con
 * significado, no una ausencia.
 */
export function buildParams(filtros: object): HttpParams {
  let params = new HttpParams();

  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === '') continue;
    params = params.set(clave, String(valor));
  }

  return params;
}
