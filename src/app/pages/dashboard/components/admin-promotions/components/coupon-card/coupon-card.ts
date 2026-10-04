import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coupon } from '../../../../../../models/coupon';

@Component({
  selector: 'app-coupon-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coupon-card.html'
})
export class CouponCard {
  readonly coupon = input.required<Coupon>();
  readonly edit = output<Coupon>();
  readonly delete = output<Coupon>();

  getRestrictionBadgeClass(restriction: string): string {
    const r = (restriction || '').toLowerCase();
    if (r.includes('primera') || r.includes('bienvenida')) {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    }
    if (r.includes('mayores') || r.includes('50')) {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    }
    return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  }

  getRestrictionIcon(restriction: string): string {
    const r = (restriction || '').toLowerCase();
    if (r.includes('primera') || r.includes('bienvenida')) {
      return '🎉';
    }
    if (r.includes('mayores') || r.includes('50')) {
      return '👴';
    }
    return '🏷️';
  }

  getRestrictionDescription(restriction: string): string {
    const r = (restriction || '').toLowerCase();
    if (r.includes('primera') || r.includes('bienvenida')) {
      return 'Exclusivo para la primera compra de nuevos usuarios';
    }
    if (r.includes('mayores') || r.includes('50')) {
      return 'Exclusivo para clientes mayores de 50 años';
    }
    if (!restriction || restriction === 'Ninguna') {
      return 'Sin restricciones - válido para todas las compras';
    }
    return `Restricción: ${restriction}`;
  }
}
