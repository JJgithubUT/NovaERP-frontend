import type { Uuid } from './common.model';

export interface Proveedor {
  id: Uuid;
  /** Obligatorio (NOT NULL en DB), a diferencia de Cliente. */
  rfc_o_id_fiscal: string;
  razon_social: string;
  correo: string | null;
  telefono: string | null;
  activo: boolean;
}

export interface ProveedorCreate {
  rfc_o_id_fiscal: string;
  razon_social: string;
  correo?: string | null;
  telefono?: string | null;
}

export type ProveedorUpdate = Partial<ProveedorCreate>;
