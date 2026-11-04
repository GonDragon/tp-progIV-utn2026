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
}
