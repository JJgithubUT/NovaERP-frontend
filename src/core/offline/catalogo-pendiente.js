import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../query/query-keys';
import { usePendientes } from './sync-queue';

/**
 * @typedef {import('./outbox.model.js').Entidad} Entidad
 * @typedef {import('./outbox.model.js').OutboxItem} OutboxItem
 * @typedef {'crear' | 'actualizar' | 'baja'} TipoPendiente
 */

/**
 * Solo estos se pintan encima de la tabla. Un 'fallido' ya lo rechazó el
 * servidor: mostrar sus valores como si fueran a guardarse sería mentir. Ese lo
 * enseña el banner rojo, con sus botones de reintentar y descartar.
 */
const ESTADOS_EN_CAMINO = new Set(['pendiente', 'enviando']);

/**
 * Superpone a las filas que devolvió el servidor los cambios que siguen en el
 * outbox, para que el usuario vea su cambio en la tabla en cuanto pulsa
 * «Guardar», aunque no haya red.
 *
 * No escribe en la caché de TanStack Query a propósito. La fuente de los
 * cambios pendientes es el outbox de IndexedDB, que ya sobrevive a recargas y
 * al cierre de la pestaña; derivarlos de ahí en cada render hace que:
 *
 * - al recargar sin red, la tabla siga mostrando lo pendiente;
 * - cuando el SW o la app envían un item y lo borran del outbox, la marca
 *   desaparezca sola, sin código que «deshaga» la caché;
 * - un refetch del servidor no pise el cambio local mientras siga pendiente.
 *
 * Las filas modificadas llevan `_pendiente` con el tipo de operación, para que
 * la pantalla las marque y bloquee lo que no se puede hacer todavía.
 *
 * @template {{ id: string }} T
 * @param {Entidad} entidad
 * @param {T[]} filas Las filas tal como las devolvió el servidor.
 * @param {{
 *   tenantSlug: string,
 *   pagina?: number,
 *   busqueda?: string,
 *   camposBusqueda?: string[],
 * }} opciones `pagina` y `busqueda` deciden si las altas pendientes caben en la
 *   vista: se muestran solo en la primera página y solo si coinciden con lo
 *   buscado, igual que haría el servidor.
 * @returns {(T & { _pendiente?: TipoPendiente })[]}
 */
export function useCatalogoConPendientes(entidad, filas, opciones) {
  const { tenantSlug, pagina = 1, busqueda = '', camposBusqueda = [] } = opciones;
  const todos = usePendientes();

  useRefrescarAlSincronizar(entidad, tenantSlug, todos);

  return useMemo(() => {
    const enCamino = todos.filter(
      (item) =>
        item.entidad === entidad &&
        item.tenantSlug === tenantSlug &&
        ESTADOS_EN_CAMINO.has(item.estado),
    );

    /** @type {Map<string, { parche: object, tipo: TipoPendiente }>} */
    const cambios = new Map();
    const altas = [];

    // El outbox llega ordenado por `createdAt`: aplicar en ese orden deja el
    // último cambio encima, igual que hará el servidor al recibirlos.
    for (const item of enCamino) {
      if (item.operacion === 'crear') {
        altas.push({
          activo: true,
          ...(/** @type {object} */ (item.body) ?? {}),
          // El id del item del outbox hace de id temporal: es único y estable
          // mientras el alta no sincroniza.
          id: item.id,
          _pendiente: /** @type {TipoPendiente} */ ('crear'),
        });
        continue;
      }

      const id = idDeLaUrl(item.url);
      if (!id) continue;

      const previo = cambios.get(id)?.parche ?? {};
      cambios.set(
        id,
        item.operacion === 'baja'
          ? { parche: { ...previo, activo: false }, tipo: 'baja' }
          : { parche: { ...previo, .../** @type {object} */ (item.body ?? {}) }, tipo: 'actualizar' },
      );
    }

    const existentes = filas.map((fila) => {
      const cambio = cambios.get(fila.id);
      return cambio ? { ...fila, ...cambio.parche, _pendiente: cambio.tipo } : fila;
    });

    if (pagina !== 1 || altas.length === 0) return existentes;

    const texto = busqueda.trim().toLowerCase();
    const altasVisibles = texto
      ? altas.filter((alta) =>
          camposBusqueda.some((campo) =>
            String(alta[campo] ?? '')
              .toLowerCase()
              .includes(texto),
          ),
        )
      : altas;

    // Las más recientes arriba: es donde el usuario espera ver lo que acaba de
    // capturar.
    return [...altasVisibles.reverse(), ...existentes];
  }, [todos, entidad, tenantSlug, filas, pagina, busqueda, camposBusqueda]);
}

/**
 * Cuando un item de esta entidad sale del outbox —se envió, o el usuario lo
 * descartó—, vuelve a pedir la lista.
 *
 * Hace falta porque el envío puede terminar *después* del refetch que TanStack
 * hace al reconectar: el SW drena por su cuenta, sin avisar a la pestaña. Sin
 * esto, la marca «pendiente» se quitaría y la fila volvería a enseñar el dato
 * viejo del último refetch. Y un alta nunca aparecería con su id real.
 *
 * @param {Entidad} entidad
 * @param {string} tenantSlug
 * @param {readonly OutboxItem[]} todos
 */
function useRefrescarAlSincronizar(entidad, tenantSlug, todos) {
  const queryClient = useQueryClient();
  const anteriores = useRef(/** @type {Set<string> | null} */ (null));

  useEffect(() => {
    const actuales = new Set(
      todos
        .filter((item) => item.entidad === entidad && item.tenantSlug === tenantSlug)
        .map((item) => item.id),
    );

    // La primera vez solo se toma la foto: no salió nada, se acaba de montar.
    const salioAlguno =
      anteriores.current !== null && [...anteriores.current].some((id) => !actuales.has(id));
    anteriores.current = actuales;

    if (salioAlguno) {
      void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, entidad) });
    }
  }, [todos, entidad, tenantSlug, queryClient]);
}

/**
 * El id del registro en `/api/ventas/clientes/<id>/`. El outbox guarda la URL
 * absoluta (la necesita `fetch` en el SW), así que se lee del `pathname`.
 *
 * @param {string} url
 */
function idDeLaUrl(url) {
  try {
    const partes = new URL(url, window.location.origin).pathname.split('/').filter(Boolean);
    return partes.at(-1) ?? null;
  } catch {
    return null;
  }
}