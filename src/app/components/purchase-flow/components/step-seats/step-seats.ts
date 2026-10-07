import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Movie, Schedule } from '../../../../models/movie';
import { Seat } from '../../../../models/seat';
import { PurchaseService, SALA_ROWS_CONFIG } from '../../../../services/purchase.service';
import { SeatComponent } from '../../../seat/seat';

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
  imports: [CommonModule, SeatComponent],
  templateUrl: './step-seats.html',
  styleUrl: './step-seats.css'
})
export class StepSeats implements OnInit, OnDestroy {
  private readonly purchaseService = inject(PurchaseService);

  @Input({ required: true }) movie!: Movie;
  @Input({ required: true }) schedule!: Schedule;
  @Input({ required: true }) requiredQuantity!: number;
  @Input({ required: true }) selectedSeats: Seat[] = [];

  @Output() seatToggled = new EventEmitter<Seat>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  readonly allSeats = signal<Seat[]>([]);
  readonly reservedSeatIds = signal<Set<number>>(new Set());
  readonly isLoadingSeats = signal<boolean>(true);

  private realtimeChannel: RealtimeChannel | null = null;
  private expirationInterval: any = null;

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

  get isSelectionComplete(): boolean {
    return (this.selectedSeats?.length || 0) === this.requiredQuantity;
  }

  async ngOnInit(): Promise<void> {
    await this.loadSalaSeatsAndReservations();

    const sched = this.schedule;
    if (!sched) return;
    const funcionId = Number(sched.id);

    // Suscripción a cambios en tiempo real vía Supabase Realtime
    this.realtimeChannel = this.purchaseService.subscribeToSeatReservations(
      funcionId,
      () => {
        this.refreshReservations();
      }
    );

    // Verificación periódica para descartar reservas expiradas automáticamente
    this.expirationInterval = setInterval(() => {
      this.refreshReservations();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.purchaseService.unsubscribe(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
      this.expirationInterval = null;
    }
  }

  async refreshReservations(): Promise<void> {
    try {
      const sched = this.schedule;
      if (!sched) return;
      const funcionId = Number(sched.id);
      const reserved = await this.purchaseService.getReservedSeatIds(funcionId);
      this.reservedSeatIds.set(reserved);
    } catch (e) {
      console.warn('Error refrescando reservas en tiempo real:', e);
    }
  }

  async loadSalaSeatsAndReservations(): Promise<void> {
    this.isLoadingSeats.set(true);
    const sched = this.schedule;
    if (!sched) {
      this.isLoadingSeats.set(false);
      return;
    }
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
    return (this.selectedSeats || []).some(s => s.id === seat.id || (s.fila === seat.fila && s.columna === seat.columna));
  }

  onSelectSeat(seat: Seat): void {
    if (seat.isReserved) return;
    this.seatToggled.emit(seat);
  }

  onNext(): void {
    if (this.isSelectionComplete) {
      this.next.emit();
    }
  }

  onBack(): void {
    this.back.emit();
  }
}
