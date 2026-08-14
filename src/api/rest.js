import { api } from './client';
import { buildParams } from './http-params';
/**
 * Envoltorio mínimo sobre axios para los servicios de cada módulo.
 *
 * En Angular cada `*.api.ts` era una clase que inyectaba `HttpClient` y
 * repetía el mismo `firstValueFrom(this.http.get(...))` en cada método. Aquí
 * los servicios son módulos de funciones, así que ese preámbulo se factoriza
 * una vez: `crearRecurso('/api/ventas')` devuelve los verbos ya atados a su
 * prefijo, con los filtros vacíos descartados y la respuesta desenvuelta de
 * `AxiosResponse`.
 *
 * Lo que NO hace, igual que no lo hacían las clases de Angular: cachear,
 * guardar estado o decidir cuándo pedir. De eso se encarga TanStack Query, que
 * es quien sabe qué clave invalidar tras cada mutación. El `Authorization` lo
 * pone el interceptor de `client.ts` y los errores llegan ya como `ApiError`.
 */
export function crearRecurso(base) {
  return {
    async get(ruta, query = {}) {
      const { data } = await api.get(base + ruta, { params: buildParams(query) });
      return data;
    },
    async post(ruta, body = {}) {
      const { data } = await api.post(base + ruta, body);
      return data;
    },
    async patch(ruta, body) {
      const { data } = await api.patch(base + ruta, body);
      return data;
    },
    async del(ruta, query = {}) {
      const { data } = await api.delete(base + ruta, { params: buildParams(query) });
      return data;
    },
    /** Descargas (exportación de bitácora, reportes). Se auditan como EXPORT. */
    async blob(ruta, query = {}) {
      const { data } = await api.get(base + ruta, {
        params: buildParams(query),
        responseType: 'blob',
      });
      return data;
    },
  };
}
