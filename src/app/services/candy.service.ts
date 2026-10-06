import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditService } from './audit.service';
import { CandyProduct, Combo } from '../models/candy';

@Injectable({
  providedIn: 'root'
})
export class CandyService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);

  private readonly _products = signal<CandyProduct[]>([]);
  private readonly _combos = signal<Combo[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly products = this._products.asReadonly();
  readonly combos = this._combos.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.initData();
  }

  async initData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      await Promise.all([this.loadProducts(), this.loadCombos()]);
    } catch (err: any) {
      this._error.set(err.message || 'Error al inicializar datos de Candy Bar');
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadProducts(): Promise<CandyProduct[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('productos_candy')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al cargar productos de candy de Supabase:', error.message);
        this._error.set(error.message);
        return [];
      }

      const products: CandyProduct[] = (data || []).map(item => ({
        id: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        precio: Number(item.precio),
        costo_puntos: Number(item.costo_puntos || 0)
      }));

      this._products.set(products);
      return products;
    } catch (err: any) {
      console.error('Error conectando a Supabase para productos de candy:', err);
      this._error.set(err.message || 'Error de conexión');
      return [];
    }
  }

  async loadCombos(): Promise<Combo[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('combos')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al cargar combos de Supabase:', error.message);
        this._error.set(error.message);
        return [];
      }

      const combos: Combo[] = (data || []).map(item => ({
        id: item.id,
        nombre: item.nombre,
        precio_fijo: Number(item.precio_fijo)
      }));

      this._combos.set(combos);
      return combos;
    } catch (err: any) {
      console.error('Error conectando a Supabase para combos:', err);
      this._error.set(err.message || 'Error de conexión');
      return [];
    }
  }

  async createProduct(productData: {
    nombre: string;
    categoria: string;
    precio: number;
    costo_puntos: number;
  }): Promise<CandyProduct | null> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        nombre: productData.nombre.trim(),
        categoria: productData.categoria.trim(),
        precio: Number(productData.precio) || 0,
        costo_puntos: Number(productData.costo_puntos) || 0
      };

      const { data, error } = await this.supabase.client
        .from('productos_candy')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error al crear producto candy en Supabase:', error.message);
        this._error.set(error.message);
        return null;
      }

      const newProduct: CandyProduct = {
        id: data.id,
        nombre: data.nombre,
        categoria: data.categoria,
        precio: Number(data.precio),
        costo_puntos: Number(data.costo_puntos || 0)
      };

      this._products.update(list => [...list, newProduct]);
      await this.auditService.log('crear_candy', 'Candy Bar', `Creó el producto "${newProduct.nombre}" con precio $${newProduct.precio} y costo ${newProduct.costo_puntos} pts`);

      return newProduct;
    } catch (err: any) {
      console.error('Error en createProduct:', err);
      this._error.set(err.message || 'Error inesperado al crear el producto');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateProduct(
    id: number,
    productData: {
      nombre: string;
      categoria: string;
      precio: number;
      costo_puntos: number;
    }
  ): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        nombre: productData.nombre.trim(),
        categoria: productData.categoria.trim(),
        precio: Number(productData.precio) || 0,
        costo_puntos: Number(productData.costo_puntos) || 0
      };

      const { error } = await this.supabase.client
        .from('productos_candy')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar producto candy en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._products.update(list =>
        list.map(item => (item.id === id ? { ...item, ...payload } : item))
      );

      await this.auditService.log('modificar_candy', 'Candy Bar', `Actualizó el producto "${payload.nombre}" (ID: ${id}) con precio $${payload.precio} y costo ${payload.costo_puntos} pts`);
      return true;
    } catch (err: any) {
      console.error('Error en updateProduct:', err);
      this._error.set(err.message || 'Error inesperado al actualizar el producto');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const existing = this._products().find(p => p.id === id);
      const { error } = await this.supabase.client
        .from('productos_candy')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar producto candy en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._products.update(list => list.filter(item => item.id !== id));
      await this.auditService.log('eliminar_candy', 'Candy Bar', `Eliminó el producto "${existing?.nombre || id}" (ID: ${id})`);
      return true;
    } catch (err: any) {
      console.error('Error en deleteProduct:', err);
      this._error.set(err.message || 'Error inesperado al eliminar el producto');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createCombo(comboData: {
    nombre: string;
    precio_fijo: number;
  }): Promise<Combo | null> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        nombre: comboData.nombre.trim(),
        precio_fijo: Number(comboData.precio_fijo) || 0
      };

      const { data, error } = await this.supabase.client
        .from('combos')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error al crear combo en Supabase:', error.message);
        this._error.set(error.message);
        return null;
      }

      const newCombo: Combo = {
        id: data.id,
        nombre: data.nombre,
        precio_fijo: Number(data.precio_fijo)
      };

      this._combos.update(list => [...list, newCombo]);
      await this.auditService.log('crear_combo', 'Candy Bar', `Creó el combo "${newCombo.nombre}" con precio fijo $${newCombo.precio_fijo}`);

      return newCombo;
    } catch (err: any) {
      console.error('Error en createCombo:', err);
      this._error.set(err.message || 'Error inesperado al crear el combo');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCombo(
    id: number,
    comboData: {
      nombre: string;
      precio_fijo: number;
    }
  ): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        nombre: comboData.nombre.trim(),
        precio_fijo: Number(comboData.precio_fijo) || 0
      };

      const { error } = await this.supabase.client
        .from('combos')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar combo en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._combos.update(list =>
        list.map(item => (item.id === id ? { ...item, ...payload } : item))
      );

      await this.auditService.log('modificar_combo', 'Candy Bar', `Actualizó el combo "${payload.nombre}" (ID: ${id}) a precio fijo $${payload.precio_fijo}`);
      return true;
    } catch (err: any) {
      console.error('Error en updateCombo:', err);
      this._error.set(err.message || 'Error inesperado al actualizar el combo');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCombo(id: number): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const existing = this._combos().find(c => c.id === id);
      const { error } = await this.supabase.client
        .from('combos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar combo en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._combos.update(list => list.filter(item => item.id !== id));
      await this.auditService.log('eliminar_combo', 'Candy Bar', `Eliminó el combo "${existing?.nombre || id}" (ID: ${id})`);
      return true;
    } catch (err: any) {
      console.error('Error en deleteCombo:', err);
      this._error.set(err.message || 'Error inesperado al eliminar el combo');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  private async logActivity(action: string): Promise<void> {
    await this.auditService.log('modificar_candy', 'Candy Bar', action);
  }
}
