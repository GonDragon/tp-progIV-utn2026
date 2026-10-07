import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Seat } from '../../models/seat';

@Component({
  selector: 'app-seat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seat.html',
  styleUrl: './seat.css'
})
export class SeatComponent {
  @Input({ required: true }) seat!: Seat;
  @Input() isSelected = false;

  @Output() seatClick = new EventEmitter<Seat>();

  get seatClass(): string {
    if (!this.seat) return 'butaca';
    const classes = ['butaca'];

    if (this.seat.tipo === 'Discapacidad') {
      classes.push('butaca-accesible');
    } else if (this.seat.tipo === 'VIP') {
      classes.push('butaca-vip');
    } else {
      classes.push('butaca-normal');
    }

    if (this.seat.isReserved) {
      classes.push('butaca-ocupada');
    } else if (this.isSelected) {
      classes.push('butaca-seleccionada');
    }

    return classes.join(' ');
  }

  onSeatClick(): void {
    if (this.seat && !this.seat.isReserved) {
      this.seatClick.emit(this.seat);
    }
  }
}
