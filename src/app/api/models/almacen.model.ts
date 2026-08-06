import type { Uuid } from './common.model';

export interface Almacen {
  id: Uuid;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

export interface AlmacenCreate {
  nombre: string;
  ubicacion?: string | null;
}

export type AlmacenUpdate = Partial<AlmacenCreate>;
