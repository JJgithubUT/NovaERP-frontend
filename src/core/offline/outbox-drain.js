import { db } from './nova-db';

/**
 * @typedef {import('./outbox.model.js').OutboxItem} OutboxItem
 * @typedef {{ enviados: number, fallidos: number, sinRed: boolean }} DrenadoResultado
 * @typedef {'enviado' | 'fallido' | 'sin-red'} Desenlace
 */

/**
 * Procesa el outbox contra el backend.
 *
 * Vive aparte del resto del código de sincronización a propósito: las mismas
 * reglas las ejecutan **dos** entornos —la aplicación cuando la pestaña está
 * abierta y el Service Worker desde el evento `sync` cuando no lo está—. Si
 * cada uno implementara su propio drenado, tarde o temprano divergirían en el
 * punto donde más caro sale: el orden y la deduplicación de escrituras.
 *
 * @param {string} [tenantSlug] Limita el drenado a un tenant. El SW lo omite:
 *   al despertarse no sabe quién tiene la sesión abierta y debe drenar todo lo
 *   pendiente del dispositivo.
 * @returns {Promise<DrenadoResultado>}
 */
export async function drenarOutbox(tenantSlug) {
  /** @type {DrenadoResultado} */
  const resultado = { enviados: 0, fallidos: 0, sinRed: false };

  await liberarAtascados();
  const pendientes = await leerPendientes(tenantSlug);

  for (const item of pendientes) {
    // Otro drenado (la app o el SW) ya lo tomó: no lo mandes dos veces.
    const tomado = await tomar(item);
    if (!tomado) continue;

    const desenlace = await enviar(item);

    if (desenlace === 'enviado') resultado.enviados++;
    if (desenlace === 'fallido') resultado.fallidos++;
    if (desenlace === 'sin-red') {
      // Los siguientes van a fallar igual: solo gastarían intentos y dejarían
      // items marcados como reintentados sin haberlo sido de verdad.
      resultado.sinRed = true;
      break;
    }
  }

  return resultado;
}

/**
 * El orden de llegada no es negociable: si el usuario creó un cliente offline y
 * luego lo editó, mandar el PATCH antes que el POST daría 404.
 *
 * @param {string} [tenantSlug]
 * @returns {Promise<OutboxItem[]>}
 */
async function leerPendientes(tenantSlug) {
  const query = tenantSlug
    ? db.outbox.where('[tenantSlug+estado]').equals([tenantSlug, 'pendiente'])
    : db.outbox.where('estado').equals('pendiente');

  return await query.sortBy('createdAt');
}

/**
 * Marca el item como en vuelo dentro de una transacción, y solo si sigue
 * 'pendiente'. Es lo que impide que la app y el SW, drenando a la vez, manden
 * el mismo POST dos veces y creen dos clientes idénticos.
 *
 * @param {OutboxItem} item
 */
async function tomar(item) {
  return await db.transaction('rw', db.outbox, async () => {
    const actual = await db.outbox.get(item.id);
    if (actual?.estado !== 'pendiente') return false;

    await db.outbox.update(item.id, {
      estado: 'enviando',
      intentos: actual.intentos + 1,
      tomadoEn: Date.now(),
    });
    return true;
  });
}

/**
 * Pasado este tiempo, un item 'enviando' ya no está en vuelo: quien lo tomó
 * murió antes de resolverlo. Holgado a propósito —muy por encima de lo que
 * tarda un `fetch` lento— para no rescatar uno que de verdad sigue en camino y
 * mandarlo dos veces.
 */
const ATASCADO_TRAS_MS = 5 * 60 * 1000;

/**
 * Devuelve a 'pendiente' los items que se quedaron en 'enviando'.
 *
 * Pasa cuando el navegador mata al SW a mitad del `fetch` (lo hace sin aviso,
 * por tiempo o por memoria) o cuando se cierra la pestaña que drenaba. Sin
 * esto, el item no lo vuelve a tomar nadie —`leerPendientes` solo lee
 * 'pendiente'— y el banner muestra «1 cambio pendiente» para siempre.
 *
 * Un item sin `tomadoEn` viene de antes de este campo: se considera atascado.
 */
async function liberarAtascados() {
  const limite = Date.now() - ATASCADO_TRAS_MS;
  await db.outbox
    .where('estado')
    .equals('enviando')
    .and((item) => (item.tomadoEn ?? 0) < limite)
    .modify({ estado: 'pendiente' });
}

/**
 * @param {OutboxItem} item
 * @returns {Promise<Desenlace>}
 */
async function enviar(item) {
  try {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${item.token}`,
      },
      body: item.method === 'DELETE' ? undefined : JSON.stringify(item.body),
    });

    if (response.ok) {
      await db.outbox.delete(item.id);
      return 'enviado';
    }

    // 4xx es definitivo: reintentar no lo arregla. Un 422 significa que el dato
    // viola una regla; un 401, que el token de 8h caducó estando offline. En
    // ambos casos hace falta el usuario, así que se marca y se le muestra.
    if (response.status >= 400 && response.status < 500) {
      await db.outbox.update(item.id, {
        estado: 'fallido',
        ultimoError: await leerMensajeDeError(response),
      });
      return 'fallido';
    }

    // 5xx: el problema es del servidor, no del dato. Vuelve a la cola intacto.
    await db.outbox.update(item.id, { estado: 'pendiente' });
    return 'sin-red';
  } catch {
    // La petición ni salió del dispositivo.
    await db.outbox.update(item.id, { estado: 'pendiente' });
    return 'sin-red';
  }
}

/**
 * Aplana los dos dialectos de error del backend a un texto para el usuario.
 *
 * @param {Response} response
 */
async function leerMensajeDeError(response) {
  try {
    const body = await response.json();
    if (typeof body === 'object' && body !== null) {
      const { detail, mensaje } = body;
      if (typeof detail === 'string') return detail;
      if (typeof mensaje === 'string') return mensaje;
    }
  } catch {
    // Cuerpo no-JSON (un 502 con HTML de nginx, típicamente).
  }
  return `Error ${response.status}`;
}