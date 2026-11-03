import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditService } from './audit.service';
import { Coupon } from '../models/coupon';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);

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
        activo: item.activo !== undefined && item.activo !== null ? Boolean(item.activo) : true,
        usado: Boolean(item.usado)
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
    activo?: boolean;
  }): Promise<Coupon | null> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload = {
        codigo: couponData.codigo.trim().toUpperCase(),
        porcentaje_descuento: Number(couponData.porcentaje_descuento) || 0,
        activo: couponData.activo !== undefined ? couponData.activo : true
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
        activo: Boolean(data.activo)
      };

      this._coupons.update(list => [...list, newCoupon]);
      await this.auditService.log('crear_cupon', 'Promociones & Cupones', `Creó el cupón "${newCoupon.codigo}" con ${newCoupon.porcentaje_descuento}% de descuento`);

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
      activo?: boolean;
    }
  ): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const payload: { codigo: string; porcentaje_descuento: number; activo?: boolean } = {
        codigo: couponData.codigo.trim().toUpperCase(),
        porcentaje_descuento: Number(couponData.porcentaje_descuento) || 0
      };
      if (couponData.activo !== undefined) {
        payload.activo = couponData.activo;
      }

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

      await this.auditService.log('modificar_cupon', 'Promociones & Cupones', `Actualizó el cupón "${payload.codigo}" (ID: ${id}) a ${payload.porcentaje_descuento}% descuento`);
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
      await this.auditService.log('eliminar_cupon', 'Promociones & Cupones', `Eliminó el cupón "${existing?.codigo || id}" (ID: ${id})`);
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
    return this.updateConfiguracion('cuenta_nueva', percent);
  }

  async toggleCouponStatus(id: number, activo: boolean): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const { error } = await this.supabase.client
        .from('cupones')
        .update({ activo })
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar estado del cupón:', error.message);
        this._error.set(error.message);
        return false;
      }

      this._coupons.update(list =>
        list.map(item => (item.id === id ? { ...item, activo } : item))
      );

      const coupon = this._coupons().find(c => c.id === id);
      await this.auditService.log(
        'modificar_cupon',
        'Promociones & Cupones',
        `${activo ? 'Activó' : 'Desactivó'} el cupón "${coupon?.codigo || id}" (ID: ${id})`
      );
      return true;
    } catch (err: any) {
      console.error('Error en toggleCouponStatus:', err);
      this._error.set(err.message || 'Error inesperado al cambiar estado del cupón');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadConfiguraciones(): Promise<{ cuenta_nueva: number; mayores_50: number }> {
    try {
      const { data, error } = await this.supabase.client
        .from('configuraciones')
        .select('*');

      if (error) {
        console.error('Error al cargar configuraciones:', error.message);
        return { cuenta_nueva: 20, mayores_50: 10 };
      }

      let cuenta_nueva = 20;
      let mayores_50 = 10;

      (data || []).forEach(row => {
        if (row.nombre === 'cuenta_nueva') {
          cuenta_nueva = Number(row.valor);
        } else if (row.nombre === 'mayores_50') {
          mayores_50 = Number(row.valor);
        }
      });

      return { cuenta_nueva, mayores_50 };
    } catch (err: any) {
      console.error('Error cargando configuraciones:', err);
      return { cuenta_nueva: 20, mayores_50: 10 };
    }
  }

  async updateConfiguracion(nombre: string, valor: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('configuraciones')
        .update({ valor })
        .eq('nombre', nombre)
        .select();

      if (error) {
        console.error(`Error al actualizar configuracion ${nombre}:`, error.message);
        this._error.set(error.message);
        return false;
      }

      if (!data || data.length === 0) {
        const insertRes = await this.supabase.client
          .from('configuraciones')
          .insert({ nombre, valor });

        if (insertRes.error) {
          console.error(`Error al insertar configuracion ${nombre}:`, insertRes.error.message);
          this._error.set(insertRes.error.message);
          return false;
        }
      }

      const label = nombre === 'cuenta_nueva' ? 'Nuevos usuarios' : nombre === 'mayores_50' ? 'Mayores de 50' : nombre;
      await this.auditService.log(
        'modificar_descuento',
        'Promociones & Cupones',
        `Actualizó porcentaje de descuento para "${label}" a ${valor}%`
      );
      return true;
    } catch (err: any) {
      console.error(`Error en updateConfiguracion ${nombre}:`, err);
      this._error.set(err.message || 'Error inesperado al guardar configuración');
      return false;
    }
  }

  private async logActivity(action: string): Promise<void> {
    await this.auditService.log('crear_cupon', 'Promociones & Cupones', action);
  }
}
