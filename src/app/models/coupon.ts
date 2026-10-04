export interface Coupon {
  id: number;
  codigo: string;
  porcentaje_descuento: number;
  tipo_restriccion: string;
}

export const COUPON_RESTRICTIONS = [
  'Ninguna',
  'Primera Compra',
  'Mayores 50'
] as const;

export type CouponRestriction = (typeof COUPON_RESTRICTIONS)[number] | string;
