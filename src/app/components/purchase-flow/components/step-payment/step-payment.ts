import { Component, input, output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Movie, Schedule } from '../../../../models/movie';
import { Seat } from '../../../../models/seat';
import { SelectedCandyItem } from '../../../../models/purchase';
import { Coupon } from '../../../../models/coupon';
import { AuthService } from '../../../../services/auth';
import { CouponService } from '../../../../services/coupon.service';
import { VIP_SURCHARGE } from '../../../../services/purchase.service';

@Component({
  selector: 'app-step-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-payment.html'
})
export class StepPayment implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly couponService = inject(CouponService);

  readonly movie = input.required<Movie>();
  readonly schedule = input.required<Schedule>();
  readonly selectedSeats = input.required<Seat[]>();
  readonly candyItems = input.required<SelectedCandyItem[]>();
  readonly isProcessing = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly confirmPurchase = output<{
    customerName: string;
    customerEmail: string;
    coupon?: Coupon | null;
  }>();
  readonly back = output<void>();

  customerNameInput = signal<string>('');
  customerEmailInput = signal<string>('');

  appliedCoupon = signal<Coupon | null>(null);
  isCheckingCoupon = signal<boolean>(false);

  readonly vipSurcharge = VIP_SURCHARGE;

  readonly baseTicketPrice = computed(() => {
    const s = this.schedule();
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  });

  readonly vipSeatsCount = computed(() => {
    return this.selectedSeats().filter(s => s.tipo === 'VIP').length;
  });

  readonly totalVipSurcharge = computed(() => {
    return this.vipSeatsCount() * this.vipSurcharge;
  });

  readonly ticketsSubtotal = computed(() => {
    return (this.selectedSeats().length * this.baseTicketPrice()) + this.totalVipSurcharge();
  });

  readonly candySubtotal = computed(() => {
    return this.candyItems().reduce((acc, curr) => acc + (curr.precio * curr.cantidad), 0);
  });

  readonly rawSubtotal = computed(() => {
    return this.ticketsSubtotal() + this.candySubtotal();
  });

  readonly couponDiscount = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon || !coupon.porcentaje_descuento) return 0;
    return (this.rawSubtotal() * Number(coupon.porcentaje_descuento)) / 100;
  });

  readonly subtotalAfterCoupon = computed(() => {
    return Math.max(0, this.rawSubtotal() - this.couponDiscount());
  });

  readonly availableSaldoFavor = computed(() => {
    return Number(this.currentUser()?.saldo_favor || 0);
  });

  readonly saldoFavorDiscount = computed(() => {
    if (!this.currentUser()) return 0;
    return Math.min(this.subtotalAfterCoupon(), this.availableSaldoFavor());
  });

  readonly grandTotal = computed(() => {
    return Math.max(0, this.subtotalAfterCoupon() - this.saldoFavorDiscount());
  });

  readonly currentUser = computed(() => this.authService.currentUser());

  async ngOnInit(): Promise<void> {
    const user = this.authService.currentUser();
    if (user) {
      this.customerNameInput.set(`${user.nombre} ${user.apellido}`.trim() || 'Cliente Registrado');
      this.customerEmailInput.set(user.email || '');

      // Evaluar cupones automáticos (cuenta_nueva o mayores_50)
      this.isCheckingCoupon.set(true);
      try {
        const coupon = await this.couponService.evaluateAutomaticCoupon(user.id, user.fecha_nacimiento);
        if (coupon) {
          this.appliedCoupon.set(coupon);
        }
      } catch (e) {
        console.warn('Error al evaluar cupón automático:', e);
      } finally {
        this.isCheckingCoupon.set(false);
      }
    }
  }

  isFormValid(): boolean {
    if (this.currentUser()) {
      return true;
    }
    const name = this.customerNameInput().trim();
    const email = this.customerEmailInput().trim();
    return name.length > 2 && email.includes('@') && email.includes('.');
  }

  onConfirm(): void {
    if (!this.isFormValid() || this.isProcessing() || this.isCheckingCoupon()) return;

    let finalName = this.customerNameInput().trim();
    let finalEmail = this.customerEmailInput().trim();

    const user = this.currentUser();
    if (user) {
      finalName = `${user.nombre} ${user.apellido}`.trim() || user.email;
      finalEmail = user.email;
    }

    this.confirmPurchase.emit({
      customerName: finalName || 'Cliente Invitado',
      customerEmail: finalEmail || 'invitado@cine.com',
      coupon: this.appliedCoupon()
    });
  }

  onBack(): void {
    this.back.emit();
  }
}
