import type { DecimalString, Uuid } from './common.model';

export interface Cliente {
  id: Uuid;
  /** Opcional, a diferencia de Proveedor. */
  rfc_o_id_fiscal: string | null;
  razon_social: string;
  correo: string | null;
  telefono: string | null;
  limite_credito: DecimalString;
  activo: boolean;
}

export interface ClienteCreate {
  rfc_o_id_fiscal?: string | null;
  razon_social: string;
  correo?: string | null;
  telefono?: string | null;
  limite_credito?: DecimalString;
}

export type ClienteUpdate = Partial<ClienteCreate>;
