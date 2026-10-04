import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Movie } from '../../../../../../models/movie';
import { AdminService } from '../../../../../../services/admin.service';

export interface ScheduleFormData {
  movieId: string;
  time: string;
  format: '2D' | '3D' | '4D' | '5D';
  language: 'Castellano' | 'Subtitulada';
  room: string;
  basePrice: number;
  isPresale: boolean;
}

@Component({
  selector: 'app-schedule-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './schedule-modal.html',
  styleUrl: './schedule-modal.css'
})
export class ScheduleModal {
  readonly adminService = inject(AdminService);

  readonly movie = input<Movie | null>(null);
  readonly isSaving = input<boolean>(false);

  readonly save = output<ScheduleFormData>();
  readonly close = output<void>();

  scheduleTime = '17:00';
  scheduleFormat: '2D' | '3D' | '4D' | '5D' = '2D';
  scheduleLanguage: 'Castellano' | 'Subtitulada' = 'Castellano';
  scheduleBasePrice = 5500;
  scheduleIsPresale = false;
  assignedRoom: string | null = null;
  allocationError: string | null = null;
  manualRoomChoice = '';

  constructor() {
    effect(() => {
      const currentMovie = this.movie();
      if (currentMovie) {
        this.scheduleTime = '17:00';
        this.scheduleFormat = '2D';
        this.scheduleLanguage = 'Castellano';
        this.scheduleBasePrice = currentMovie.regularPrice || 5500;
        this.scheduleIsPresale = false;
        this.manualRoomChoice = this.adminService.availableRooms[0] || 'Sala 1';
        this.runAutoRoomAllocation();
      }
    });
  }

  runAutoRoomAllocation(): void {
    const current = this.movie();
    if (!current) return;

    this.allocationError = null;
    const result = this.adminService.allocateAutomaticRoom(
      this.scheduleTime,
      current.duration
    );

    if (result.success && result.room) {
      this.assignedRoom = result.room;
    } else {
      this.assignedRoom = null;
      this.allocationError = result.reason || 'No se pudo asignar sala automáticamente sin solapamiento.';
    }
  }

  onConfirm(): void {
    const current = this.movie();
    if (!current) return;

    const roomToUse = this.assignedRoom || this.manualRoomChoice;
    if (!roomToUse) return;

    this.save.emit({
      movieId: current.id,
      time: this.scheduleTime,
      format: this.scheduleFormat,
      language: this.scheduleLanguage,
      room: roomToUse,
      basePrice: Number(this.scheduleBasePrice) || 5500,
      isPresale: this.scheduleIsPresale
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
