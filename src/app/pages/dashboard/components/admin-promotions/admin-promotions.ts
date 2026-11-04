import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CouponService } from '../../../../services/coupon.service';
import { Coupon } from '../../../../models/coupon';

@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-promotions.html',
  styleUrl: './admin-promotions.css'
})
export class AdminPromotions implements OnInit {
  readonly Math = Math;
  readonly couponService = inject(CouponService);

  // Configuration values for discounts
  readonly cuentaNuevaPercent = signal<number>(20);
  readonly mayores50Percent = signal<number>(10);
  readonly isSavingCuentaNueva = signal<boolean>(false);
  readonly isSavingMayores50 = signal<boolean>(false);
  readonly isLoadingConfigs = signal<boolean>(false);

  readonly errorCuentaNueva = signal<string | null>(null);
  readonly errorMayores50 = signal<string | null>(null);

  // Filters & Search
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Pagination (10 per page)
  readonly pageSize = 10;
  readonly currentPage = signal<number>(1);

  // Loading state for individual coupon toggle
  readonly togglingCouponId = signal<number | null>(null);

  // Toast
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimer: any = null;

  ngOnInit(): void {
    this.loadConfigs();
  }

  async loadConfigs(): Promise<void> {
    this.isLoadingConfigs.set(true);
    try {
      const configs = await this.couponService.loadConfiguraciones();
      this.cuentaNuevaPercent.set(configs.cuenta_nueva);
      this.mayores50Percent.set(configs.mayores_50);
    } finally {
      this.isLoadingConfigs.set(false);
    }
  }

  readonly filteredCoupons = computed(() => {
    const list = this.couponService.coupons();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter(coupon => {
      const isActivo = coupon.activo !== false;
      const matchStatus =
        status === 'all' ||
        (status === 'active' && isActivo) ||
        (status === 'inactive' && !isActivo);

      const matchQuery =
        !query ||
        coupon.codigo.toLowerCase().includes(query) ||
        String(coupon.id).includes(query) ||
        String(coupon.porcentaje_descuento).includes(query);

      return matchStatus && matchQuery;
    });
  });

  readonly totalPages = computed(() => {
    const total = this.filteredCoupons().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly paginatedCoupons = computed(() => {
    const list = this.filteredCoupons();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly activeCouponsCount = computed(() => {
    return this.couponService.coupons().filter(c => c.activo !== false).length;
  });

  readonly inactiveCouponsCount = computed(() => {
    return this.couponService.coupons().filter(c => c.activo === false).length;
  });

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Always show reasonable page numbers
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - 2 && i <= current + 2)
      ) {
        pages.push(i);
      }
    }
    return pages;
  });

  private showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  async reload(): Promise<void> {
    await Promise.all([
      this.couponService.loadCoupons(),
      this.loadConfigs()
    ]);
    this.showToastMessage('Datos recargados correctamente.');
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(filter: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // --- Configuration Handlers ---
  async saveCuentaNueva(): Promise<void> {
    const val = Number(this.cuentaNuevaPercent());
    if (isNaN(val) || val < 0 || val > 100) {
      this.errorCuentaNueva.set('El porcentaje debe estar entre 0 y 100.');
      return;
    }
    this.errorCuentaNueva.set(null);
    this.isSavingCuentaNueva.set(true);

    const success = await this.couponService.updateConfiguracion('cuenta_nueva', val);
    this.isSavingCuentaNueva.set(false);

    if (success) {
      this.showToastMessage(`Descuento nuevos usuarios actualizado al ${val}%.`);
    } else {
      this.showToastMessage(this.couponService.error() || 'Error al guardar descuento cuenta nueva.', 'error');
    }
  }

  async saveMayores50(): Promise<void> {
    const val = Number(this.mayores50Percent());
    if (isNaN(val) || val < 0 || val > 100) {
      this.errorMayores50.set('El porcentaje debe estar entre 0 y 100.');
      return;
    }
    this.errorMayores50.set(null);
    this.isSavingMayores50.set(true);

    const success = await this.couponService.updateConfiguracion('mayores_50', val);
    this.isSavingMayores50.set(false);

    if (success) {
      this.showToastMessage(`Descuento mayores de 50 actualizado al ${val}%.`);
    } else {
      this.showToastMessage(this.couponService.error() || 'Error al guardar descuento mayores de 50.', 'error');
    }
  }

  // --- Toggle Coupon Active / Inactive ---
  async toggleCouponActive(coupon: Coupon): Promise<void> {
    const newStatus = coupon.activo === false; // If false -> true, if undefined/true -> false
    this.togglingCouponId.set(coupon.id);

    const success = await this.couponService.toggleCouponStatus(coupon.id, newStatus);
    this.togglingCouponId.set(null);

    if (success) {
      this.showToastMessage(`Cupón "${coupon.codigo}" ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
    } else {
      this.showToastMessage(this.couponService.error() || 'Error al cambiar estado del cupón.', 'error');
    }
  }
}
