export interface Coupon {
  id: number;
  codigo: string;
  porcentaje_descuento: number;
  activo: boolean;
  usado?: boolean;
}
