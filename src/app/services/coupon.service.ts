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
        codigo: couponData.codigo.trim().toUpperCase().slice(0, 50),
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

  /**
   * Evaluates and returns an automatic coupon for a given customer according to requirements:
   * 1. Checks if customer made a previous transaction.
   *    If no previous transaction exists:
   *      - Checks if coupon with code "<idusuario>-nuevo" exists.
   *      - If it doesn't exist, creates it with config "cuenta_nueva" value and applies it.
   *      - If it exists and is not disabled or used, applies it.
   * 2. Checks user's age. If user is > 50 years old and no coupon was applied for cuenta_nueva:
   *    - Creates a coupon with config "mayores_50" value with code "<idusuario>-mayor50-<now>"
   *      (now = unix time) and applies it.
   */
  async evaluateAutomaticCoupon(userId: string, fechaNacimiento?: string | null): Promise<Coupon | null> {
    try {
      if (!userId) return null;

      const configs = await this.loadConfiguraciones();

      // 1. Revisar si el cliente realizó una transacción previamente
      const { data: txData, error: txError } = await this.supabase.client
        .from('transacciones')
        .select('id')
        .eq('perfil_id', userId)
        .limit(1);

      if (txError) {
        console.warn('Error al verificar transacciones previas del usuario:', txError.message);
      }

      const hasTransactions = Boolean(txData && txData.length > 0);
      let appliedCoupon: Coupon | null = null;

      if (!hasTransactions) {
        const welcomeCode = `${userId}-nuevo`.slice(0, 50);
        const { data: existingCoupon, error: couponError } = await this.supabase.client
          .from('cupones')
          .select('*')
          .eq('codigo', welcomeCode)
          .maybeSingle();

        if (existingCoupon) {
          const isActivo = existingCoupon.activo !== undefined && existingCoupon.activo !== null ? Boolean(existingCoupon.activo) : true;
          const isUsado = Boolean(existingCoupon.usado);
          if (isActivo && !isUsado) {
            appliedCoupon = {
              id: existingCoupon.id,
              codigo: existingCoupon.codigo,
              porcentaje_descuento: Number(existingCoupon.porcentaje_descuento),
              activo: isActivo,
              usado: isUsado
            };
          }
        } else {
          // Crear cupón nuevo con valor de configuracion cuenta_nueva
          const discountPercent = Number(configs.cuenta_nueva) || 20;
          const { data: newCouponData, error: createError } = await this.supabase.client
            .from('cupones')
            .insert({
              codigo: welcomeCode,
              porcentaje_descuento: discountPercent,
              activo: true,
              usado: false
            })
            .select()
            .single();

          if (!createError && newCouponData) {
            appliedCoupon = {
              id: newCouponData.id,
              codigo: newCouponData.codigo,
              porcentaje_descuento: Number(newCouponData.porcentaje_descuento),
              activo: Boolean(newCouponData.activo),
              usado: Boolean(newCouponData.usado)
            };
            this._coupons.update(list => [...list, appliedCoupon!]);
            await this.auditService.log(
              'crear_cupon',
              'Promociones & Cupones',
              `Creó cupón de bienvenida automático "${welcomeCode}" con ${discountPercent}% de descuento`
            );
          } else if (createError) {
            console.error('Error al crear cupón de cuenta nueva:', createError.message);
          }
        }
      }

      // 2. Si no le correspondió cupón por cuenta_nueva, verificar si nació hace más de 50 años
      if (!appliedCoupon) {
        let birthDate = fechaNacimiento;
        if (!birthDate && userId) {
          try {
            const { data: profile } = await this.supabase.client
              .from('perfiles')
              .select('fecha_nacimiento')
              .eq('id', userId)
              .maybeSingle();
            if (profile?.fecha_nacimiento) {
              birthDate = profile.fecha_nacimiento;
            }
          } catch (profileErr) {
            console.warn('Error al consultar fecha_nacimiento del perfil:', profileErr);
          }
        }

        if (birthDate && this.isBornMoreThan50YearsAgo(birthDate)) {
          const now = Math.floor(Date.now() / 1000);
          const prefix = '-mayor50-';
          const suffix = String(now);
          const maxUserIdLen = Math.max(1, 50 - prefix.length - suffix.length);
          const seniorCode = `${userId.slice(0, maxUserIdLen)}${prefix}${suffix}`.slice(0, 50);
          const discountPercent = Number(configs.mayores_50) || 10;

          const { data: seniorCouponData, error: seniorError } = await this.supabase.client
            .from('cupones')
            .insert({
              codigo: seniorCode,
              porcentaje_descuento: discountPercent,
              activo: true,
              usado: false
            })
            .select()
            .single();

          if (!seniorError && seniorCouponData) {
            appliedCoupon = {
              id: seniorCouponData.id,
              codigo: seniorCouponData.codigo,
              porcentaje_descuento: Number(seniorCouponData.porcentaje_descuento),
              activo: Boolean(seniorCouponData.activo),
              usado: Boolean(seniorCouponData.usado)
            };
            this._coupons.update(list => [...list, appliedCoupon!]);
            await this.auditService.log(
              'crear_cupon',
              'Promociones & Cupones',
              `Creó cupón para mayor de 50 automático "${seniorCode}" con ${discountPercent}% de descuento`
            );
          } else if (seniorError) {
            console.error('Error al crear cupón mayor de 50:', seniorError.message);
          }
        }
      }

      return appliedCoupon;
    } catch (err) {
      console.error('Error evaluando cupón automático:', err);
      return null;
    }
  }

  isBornMoreThan50YearsAgo(birthDateStr?: string | null): boolean {
    if (!birthDateStr) return false;
    let birthDate: Date;
    if (typeof birthDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
      const [y, m, d] = birthDateStr.split('-').map(Number);
      birthDate = new Date(y, m - 1, d);
    } else {
      birthDate = new Date(birthDateStr);
    }
    if (isNaN(birthDate.getTime())) return false;

    const today = new Date();
    const fiftyYearsAgo = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate());
    const calculatedAge = this.calculateAge(birthDateStr);
    return birthDate <= fiftyYearsAgo || (calculatedAge !== null && calculatedAge > 50);
  }

  async validateCouponCode(codigo: string): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
    try {
      const code = codigo.trim();
      if (!code) {
        return { valid: false, error: 'Ingresa un código de cupón' };
      }

      const { data, error } = await this.supabase.client
        .from('cupones')
        .select('*')
        .ilike('codigo', code)
        .maybeSingle();

      if (error || !data) {
        return { valid: false, error: 'El cupón no existe' };
      }

      const isActivo = data.activo !== undefined && data.activo !== null ? Boolean(data.activo) : true;
      const isUsado = Boolean(data.usado);

      if (!isActivo) {
        return { valid: false, error: 'El cupón se encuentra deshabilitado' };
      }

      if (isUsado) {
        return { valid: false, error: 'El cupón ya ha sido utilizado' };
      }

      return {
        valid: true,
        coupon: {
          id: data.id,
          codigo: data.codigo,
          porcentaje_descuento: Number(data.porcentaje_descuento),
          activo: isActivo,
          usado: isUsado
        }
      };
    } catch (err: any) {
      return { valid: false, error: 'Error al validar el cupón' };
    }
  }

  calculateAge(birthDateStr?: string | null): number | null {
    if (!birthDateStr) return null;
    let birthDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
      const [y, m, d] = birthDateStr.split('-').map(Number);
      birthDate = new Date(y, m - 1, d);
    } else {
      birthDate = new Date(birthDateStr);
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  private async logActivity(action: string): Promise<void> {
    await this.auditService.log('crear_cupon', 'Promociones & Cupones', action);
  }
}
