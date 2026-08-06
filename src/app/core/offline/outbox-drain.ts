import { db } from './nova-db';
import type { OutboxItem } from './outbox.model';

export interface DrenadoResultado {
  enviados: number;
  /** Rechazados por el backend con un error definitivo (4xx). */
  fallidos: number;
  /** Se cortó el drenado porque la red sigue caída. */
  sinRed: boolean;
}

/**
 * Procesa el outbox contra el backend.
 *
 * Vive fuera de Angular a propósito: la ejecutan **dos** entornos con las
 * mismas reglas —el `SyncQueueService` cuando la pestaña está abierta y el
 * Service Worker desde el evento `sync` cuando no lo está—. Si cada uno
 * implementara su propio drenado, tarde o temprano divergirían en el punto
 * exacto donde más caro sale: el orden y la deduplicación de escrituras.
 *
 * @param tenantSlug Limita el drenado a un tenant. El SW lo omite: al
 * despertarse no sabe quién tiene la sesión abierta, y debe drenar todo lo
 * pendiente del dispositivo.
 */
export async function drenarOutbox(tenantSlug?: string): Promise<DrenadoResultado> {
  const resultado: DrenadoResultado = { enviados: 0, fallidos: 0, sinRed: false };

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

type Desenlace = 'enviado' | 'fallido' | 'sin-red';

/**
 * El orden de llegada no es negociable: si el usuario creó un cliente offline y
 * luego lo editó, mandar el PATCH antes que el POST daría 404.
 */
async function leerPendientes(tenantSlug?: string): Promise<OutboxItem[]> {
  const query = tenantSlug
    ? db.outbox.where('[tenantSlug+estado]').equals([tenantSlug, 'pendiente'])
    : db.outbox.where('estado').equals('pendiente');

  return await query.sortBy('createdAt');
}

/**
 * Marca el item como en vuelo dentro de una transacción, y solo si sigue
 * 'pendiente'. Es lo que impide que la app y el SW, drenando a la vez, manden
 * el mismo POST dos veces y creen dos clientes idénticos.
 */
async function tomar(item: OutboxItem): Promise<boolean> {
  return await db.transaction('rw', db.outbox, async () => {
    const actual = await db.outbox.get(item.id);
    if (actual?.estado !== 'pendiente') return false;

    await db.outbox.update(item.id, { estado: 'enviando', intentos: actual.intentos + 1 });
    return true;
  });
}

async function enviar(item: OutboxItem): Promise<Desenlace> {
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

/** Aplana los dos dialectos de error del backend a un texto para el usuario. */
async function leerMensajeDeError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      const { detail, mensaje } = body as Record<string, unknown>;
      if (typeof detail === 'string') return detail;
      if (typeof mensaje === 'string') return mensaje;
    }
  } catch {
    // Cuerpo no-JSON (un 502 con HTML de nginx, típicamente).
  }
  return `Error ${response.status}`;
}
