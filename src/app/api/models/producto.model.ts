import type { DecimalString, Uuid } from './common.model';

export interface Producto {
  id: Uuid;
  sku: string;
  nombre: string;
  descripcion: string | null;
  costo_referencia: DecimalString;
  precio_venta: DecimalString;
  stock_minimo: DecimalString;
  activo: boolean;
}

export interface ProductoCreate {
  sku: string;
  nombre: string;
  descripcion?: string | null;
  costo_referencia?: DecimalString;
  precio_venta?: DecimalString;
  stock_minimo?: DecimalString;
}

/** Todos los campos opcionales: el PATCH solo toca lo que se manda. */
export type ProductoUpdate = Partial<ProductoCreate>;
