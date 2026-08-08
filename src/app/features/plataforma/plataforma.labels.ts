import type { BadgeTono } from '../../shared/ui/badge/badge.component';
import type { TenantEstado, TipoSuspension } from '../../api/models';

/**
 * Etiquetas y tonos de la superficie de plataforma. Mismo papel que
 * `administracion.labels.ts` en la de tenant: que ninguna pantalla decida por su
 * cuenta cómo se llama un estado ni de qué color va.
 *
 * Aquí no hay datos de semilla —planes y módulos los sirve el catálogo—, solo el
 * ENUM `core.tenant_estado`, la constante `TIPOS_SUSPENSION` del servicio y el
 * mapa de campos por los que el backend admite ordenar.
 */

export const ESTADO_TENANT_LABEL: Readonly<Record<TenantEstado, string>> = {
  activo: 'Activa',
  pendiente: 'Pendiente de activación',
  suspendido: 'Suspendida',
  baja_logica: 'Dada de baja',
};

/** Lo que le pasa a la organización en ese estado, no un sinónimo del nombre. */
export const ESTADO_TENANT_AYUDA: Readonly<Record<TenantEstado, string>> = {
  activo: 'Sus usuarios pueden iniciar sesión con normalidad.',
  pendiente: 'El administrador inicial no ha canjeado su enlace de activación. Nadie puede entrar.',
  suspendido: 'Acceso bloqueado y sesiones cerradas. No se ha borrado nada y es reversible.',
  baja_logica: 'Baja lógica: la información se conserva íntegra y se puede reactivar.',
};

export const ESTADO_TENANT_TONO: Readonly<Record<TenantEstado, BadgeTono>> = {
  activo: 'exito',
  pendiente: 'aviso',
  suspendido: 'error',
  baja_logica: 'neutro',
};

export function tonoTenant(estado: TenantEstado): BadgeTono {
  return ESTADO_TENANT_TONO[estado];
}

/** Los cuatro estados, para el `<select>` de filtro. */
export const ESTADOS_TENANT: readonly { valor: TenantEstado; label: string }[] = [
  { valor: 'activo', label: 'Activas' },
  { valor: 'pendiente', label: 'Pendientes de activar' },
  { valor: 'suspendido', label: 'Suspendidas' },
  { valor: 'baja_logica', label: 'Dadas de baja' },
];

/**
 * La fase solo agrupa visualmente. Lo que decide si un módulo se puede tocar es
 * `nucleo` y la lista de planes que lo incluyen, y las dos vienen en el catálogo:
 * ninguna pantalla tiene que saberse que la fase 0 es el núcleo.
 */
const FASE_LABEL: Readonly<Record<number, string>> = {
  0: 'Núcleo',
  1: 'Operación',
  2: 'Extensiones',
};

export function etiquetaFase(fase: number): string {
  return FASE_LABEL[fase] ?? `Fase ${fase}`;
}

export const TIPOS_SUSPENSION: readonly {
  valor: TipoSuspension;
  label: string;
  ayuda: string;
}[] = [
  {
    valor: 'administrativa',
    label: 'Administrativa',
    ayuda: 'Impago, cierre de contrato, decisión comercial.',
  },
  {
    valor: 'cumplimiento',
    label: 'Cumplimiento',
    ayuda: 'Uso indebido, requerimiento legal o normativo.',
  },
];

/**
 * `tenant_service._ORDEN_TENANTS`: el backend solo admite estos cuatro campos,
 * no un ORDER BY libre. Pedirle otro responde 400.
 */
export const ORDEN_TENANTS: readonly { valor: string; label: string }[] = [
  { valor: 'razon_social', label: 'Razón social' },
  { valor: 'created_at', label: 'Fecha de alta' },
  { valor: 'estado', label: 'Estado' },
  { valor: 'plan', label: 'Plan' },
];

/* --------------------------------------------------------- reglas de estado */
//
// Qué acciones ofrece cada estado. El backend las vuelve a validar con un 422;
// esto solo evita ofrecer un botón que se sabe que va a fallar.

/** Un tenant dado de baja hay que reactivarlo antes de poder editarlo. */
export function puedeEditar(estado: TenantEstado): boolean {
  return estado !== 'baja_logica';
}

export function puedeSuspender(estado: TenantEstado): boolean {
  return estado !== 'suspendido' && estado !== 'baja_logica';
}

export function puedeDarDeBaja(estado: TenantEstado): boolean {
  return estado !== 'baja_logica';
}

/** `pendiente` no se reactiva por esta vía: se activa canjeando el enlace. */
export function puedeReactivar(estado: TenantEstado): boolean {
  return estado === 'suspendido' || estado === 'baja_logica';
}

/** Solo tiene sentido sobre un entorno que nunca llegó a activarse. */
export function puedeReenviarActivacion(estado: TenantEstado): boolean {
  return estado === 'pendiente';
}
