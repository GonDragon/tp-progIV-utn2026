import { Component, input, output, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../../../models/movie';
import { Seat } from '../../../../models/seat';
import { PurchaseService, SALA_ROWS_CONFIG } from '../../../../services/purchase.service';

export interface RowViewData {
  fila: string;
  tipo: 'Normal' | 'Discapacidad' | 'VIP';
  isAccessible: boolean;
  isVip: boolean;
  col1: Seat[];
  col2: Seat[];
  col3: Seat[];
}

@Component({
  selector: 'app-step-seats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-seats.html',
  styleUrl: './step-seats.css'
})
export class StepSeats implements OnInit {
  private readonly purchaseService = inject(PurchaseService);

  readonly movie = input.required<Movie>();
  readonly schedule = input.required<Schedule>();
  readonly requiredQuantity = input.required<number>();
  readonly selectedSeats = input.required<Seat[]>();

  readonly seatToggled = output<Seat>();
  readonly next = output<void>();
  readonly back = output<void>();

  readonly allSeats = signal<Seat[]>([]);
  readonly reservedSeatIds = signal<Set<number>>(new Set());
  readonly isLoadingSeats = signal<boolean>(true);

  readonly rowViews = computed<RowViewData[]>(() => {
    const seats = this.allSeats();
    const reservedIds = this.reservedSeatIds();
    const rows: RowViewData[] = [];

    // Map seats by code
    const seatMap = new Map<string, Seat>();
    for (const s of seats) {
      seatMap.set(`${s.fila}${s.columna}`, {
        ...s,
        isReserved: reservedIds.has(s.id)
      });
    }

    for (const rConfig of SALA_ROWS_CONFIG) {
      const isAccessible = rConfig.fila === 'J' || rConfig.fila === 'K';
      const isVip = rConfig.fila === 'R' || rConfig.fila === 'S' || rConfig.fila === 'T';

      const col1Seats: Seat[] = [];
      const col2Seats: Seat[] = [];
      const col3Seats: Seat[] = [];

      let currentSeatNum = 1;

      // Col 1
      for (let i = 0; i < rConfig.col1Count; i++) {
        const s = seatMap.get(`${rConfig.fila}${currentSeatNum}`);
        if (s) col1Seats.push(s);
        currentSeatNum++;
      }

      // Col 2
      for (let i = 0; i < rConfig.col2Count; i++) {
        const s = seatMap.get(`${rConfig.fila}${currentSeatNum}`);
        if (s) col2Seats.push(s);
        currentSeatNum++;
      }

      // Col 3
      for (let i = 0; i < rConfig.col3Count; i++) {
        const s = seatMap.get(`${rConfig.fila}${currentSeatNum}`);
        if (s) col3Seats.push(s);
        currentSeatNum++;
      }

      rows.push({
        fila: rConfig.fila,
        tipo: rConfig.tipo,
        isAccessible,
        isVip,
        col1: col1Seats,
        col2: col2Seats,
        col3: col3Seats
      });
    }

    return rows;
  });

  readonly isSelectionComplete = computed(() => {
    return this.selectedSeats().length === this.requiredQuantity();
  });

  async ngOnInit(): Promise<void> {
    await this.loadSalaSeatsAndReservations();
  }

  async loadSalaSeatsAndReservations(): Promise<void> {
    this.isLoadingSeats.set(true);
    const sched = this.schedule();
    const salaId = sched.salaId || 1;
    const funcionId = Number(sched.id);

    try {
      const [seats, reserved] = await Promise.all([
        this.purchaseService.getSeatsForSala(salaId),
        this.purchaseService.getReservedSeatIds(funcionId)
      ]);

      this.allSeats.set(seats);
      this.reservedSeatIds.set(reserved);
    } catch (e) {
      console.error('Error cargando sala y reservas:', e);
    } finally {
      this.isLoadingSeats.set(false);
    }
  }

  isSeatSelected(seat: Seat): boolean {
    return this.selectedSeats().some(s => s.id === seat.id || (s.fila === seat.fila && s.columna === seat.columna));
  }

  getSeatClass(seat: Seat): string {
    const isSelected = this.isSeatSelected(seat);
    const classes = ['butaca'];

    if (seat.tipo === 'Discapacidad') {
      classes.push('butaca-accesible');
    } else if (seat.tipo === 'VIP') {
      classes.push('butaca-vip');
    } else {
      classes.push('butaca-normal');
    }

    if (seat.isReserved) {
      classes.push('butaca-ocupada');
    } else if (isSelected) {
      classes.push('butaca-seleccionada');
    }

    return classes.join(' ');
  }

  onSelectSeat(seat: Seat): void {
    if (seat.isReserved) return;
    this.seatToggled.emit(seat);
  }

  onNext(): void {
    if (this.isSelectionComplete()) {
      this.next.emit();
    }
  }

  onBack(): void {
    this.back.emit();
  }
}
