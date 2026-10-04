export interface CandyProduct {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  costo_puntos: number;
}

export interface Combo {
  id: number;
  nombre: string;
  precio_fijo: number;
}

export const CANDY_CATEGORIES = [
  'Pochoclos',
  'Bebidas',
  'Snacks',
  'Dulces',
  'Combos',
  'Otros'
] as const;

export type CandyCategory = (typeof CANDY_CATEGORIES)[number];
