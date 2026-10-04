import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { Coupon } from '../models/coupon';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private readonly _coupons = signal<Coupon[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly coupons = this._coupons.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.initData();
  }

  async initData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      await this.loadCoupons();
    } catch (err: any) {
      this._error.set(err.message || 'Error al inicializar cupones');
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadCoupons(): Promise<Coupon[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('cupones')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al cargar cupones de Supabase:', error.message);
        this._error.set(error.message);
        return [];
      }

      const coupons: Coupon[] = (data || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        porcentaje_descuento: Number(item.porcentaje_descuento),
        tipo_restriccion: item.tipo_restriccion || 'Ninguna'
      }));

      this._coupons.set(coupons);
      return coupons;
    } catch (err: any) {
      console.error('Error conectando a Supabase para cupones:', err);
      this._error.set(err.message || 'Error de conexión');
      return [];
    }
  }

  async createCoupon(couponData: {
    codigo: string;
    porcentaje_descuento: number;
    tipo_restriccion?: string;
  }): Promise<Coupon | null> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        codigo: couponData.codigo.trim().toUpperCase(),
        porcentaje_descuento: Number(couponData.porcentaje_descuento) || 0,
        tipo_restriccion: couponData.tipo_restriccion?.trim() || 'Ninguna'
      };

      const { data, error } = await this.supabase.client
        .from('cupones')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error al crear cupón en Supabase:', error.message);
        this._error.set(error.message);
        return null;
      }

      const newCoupon: Coupon = {
        id: data.id,
        codigo: data.codigo,
        porcentaje_descuento: Number(data.porcentaje_descuento),
        tipo_restriccion: data.tipo_restriccion || 'Ninguna'
      };

      this._coupons.update(list => [...list, newCoupon]);
      await this.logActivity(`Creó el cupón "${newCoupon.codigo}" con ${newCoupon.porcentaje_descuento}% de descuento (Restricción: ${newCoupon.tipo_restriccion})`);

      return newCoupon;
    } catch (err: any) {
      console.error('Error en createCoupon:', err);
      this._error.set(err.message || 'Error inesperado al crear el cupón');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCoupon(
    id: number,
    couponData: {
      codigo: string;
      porcentaje_descuento: number;
      tipo_restriccion?: string;
    }
  ): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        codigo: couponData.codigo.trim().toUpperCase(),
        porcentaje_descuento: Number(couponData.porcentaje_descuento) || 0,
        tipo_restriccion: couponData.tipo_restriccion?.trim() || 'Ninguna'
      };

      const { error } = await this.supabase.client
        .from('cupones')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar cupón en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._coupons.update(list =>
        list.map(item => (item.id === id ? { ...item, ...payload } : item))
      );

      await this.logActivity(`Actualizó el cupón "${payload.codigo}" (ID: ${id})`);
      return true;
    } catch (err: any) {
      console.error('Error en updateCoupon:', err);
      this._error.set(err.message || 'Error inesperado al actualizar el cupón');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCoupon(id: number): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const existing = this._coupons().find(c => c.id === id);
      const { error } = await this.supabase.client
        .from('cupones')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar cupón en Supabase:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._coupons.update(list => list.filter(item => item.id !== id));
      await this.logActivity(`Eliminó el cupón "${existing?.codigo || id}"`);
      return true;
    } catch (err: any) {
      console.error('Error en deleteCoupon:', err);
      this._error.set(err.message || 'Error inesperado al eliminar el cupón');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async setWelcomeDiscountPercent(percent: number): Promise<boolean> {
    const welcome = this._coupons().find(c => c.tipo_restriccion === 'Primera Compra');
    if (welcome) {
      return await this.updateCoupon(welcome.id, {
        codigo: welcome.codigo,
        porcentaje_descuento: percent,
        tipo_restriccion: 'Primera Compra'
      });
    } else {
      const created = await this.createCoupon({
        codigo: 'BIENVENIDA' + percent,
        porcentaje_descuento: percent,
        tipo_restriccion: 'Primera Compra'
      });
      return created !== null;
    }
  }

  private async logActivity(action: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      await this.supabase.client.from('log_actividad').insert({
        perfil_id: currentUser?.id || null,
        accion: action
      });
    } catch (e) {
      console.warn('No se pudo registrar log de actividad:', e);
    }
  }
}
