import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Movie, Schedule, Sala } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { AdminService } from '../../services/admin.service';

export interface CalendarDay {
  dayNumber: number;
  date: Date;
  dateKey: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  schedules: Schedule[];
}

@Component({
  selector: 'app-movie-schedule-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-schedule-calendar.html',
  styleUrl: './movie-schedule-calendar.css'
})
export class MovieScheduleCalendar {
  readonly movieService = inject(MovieService);
  readonly adminService = inject(AdminService);

  @Input() movie: Movie | null = null;
  @Input() mode: 'client' | 'admin' = 'client';

  @Output() scheduleSelected = new EventEmitter<{ movie: Movie; schedule: Schedule }>();
  @Output() scheduleUpdated = new EventEmitter<{ movie: Movie; schedule: Schedule }>();
  @Output() scheduleDeleted = new EventEmitter<{ movie: Movie; schedule: Schedule }>();

  // Calendar navigation state - initialized to current month and year
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly selectedMonth = signal<number>(new Date().getMonth()); // 0-11

  // Day detail modal state
  readonly selectedDay = signal<CalendarDay | null>(null);

  // Admin schedule editing state
  readonly editingSchedule = signal<Schedule | null>(null);
  editTime = '17:00';
  editSalaId = 1;
  editRoom = 'Sala 1';
  editFormat = '2D';
  editLanguage = 'Castellano';
  editBasePrice = 5500;
  editIsPresale = false;
  editPresalePrice = 4500;
  editDateStr = '';
  isSavingEdit = signal<boolean>(false);

  // Admin schedule deletion confirm state
  readonly deletingSchedule = signal<Schedule | null>(null);
  isDeletingSchedule = signal<boolean>(false);
  deletionRefundSummary = signal<{ count: number; amount: number } | null>(null);

  readonly availableSalas = computed<Sala[]>(() => {
    return this.movieService.salas();
  });

  readonly monthLabel = computed<string>(() => {
    const date = new Date(this.selectedYear(), this.selectedMonth(), 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  readonly isCurrentRealMonth = computed<boolean>(() => {
    const now = new Date();
    return this.selectedYear() === now.getFullYear() && this.selectedMonth() === now.getMonth();
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const currentMovie = this.movie;
    const allSchedules = currentMovie?.schedules || [];

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayDateKey = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

    // Map schedules by dateKey
    const schedulesByDate = new Map<string, Schedule[]>();
    for (const sched of allSchedules) {
      let dKey = todayDateKey;
      if (sched.fechaHoraInicio) {
        const d = new Date(sched.fechaHoraInicio);
        if (!isNaN(d.getTime())) {
          dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!schedulesByDate.has(dKey)) {
        schedulesByDate.set(dKey, []);
      }
      schedulesByDate.get(dKey)!.push(sched);
    }

    // Sort schedules inside each date by time
    for (const list of schedulesByDate.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Monday as 0, Sunday as 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days: CalendarDay[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDayNum = prevMonthLastDay - i;
      const pDate = new Date(year, month - 1, pDayNum);
      const pDateKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDayNum).padStart(2, '0')}`;
      const scheds = schedulesByDate.get(pDateKey) || [];
      const isPast = pDateKey < todayDateKey;
      days.push({
        dayNumber: pDayNum,
        date: pDate,
        dateKey: pDateKey,
        isCurrentMonth: false,
        isToday: pDateKey === todayDateKey,
        isPast,
        schedules: scheds
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const cDate = new Date(year, month, d);
      const cDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const scheds = schedulesByDate.get(cDateKey) || [];
      const isPast = cDateKey < todayDateKey;
      days.push({
        dayNumber: d,
        date: cDate,
        dateKey: cDateKey,
        isCurrentMonth: true,
        isToday: cDateKey === todayDateKey,
        isPast,
        schedules: scheds
      });
    }

    // Next month padding days to complete grid (multiples of 7)
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nDate = new Date(year, month + 1, nextDay);
      const nDateKey = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      const scheds = schedulesByDate.get(nDateKey) || [];
      const isPast = nDateKey < todayDateKey;
      days.push({
        dayNumber: nextDay,
        date: nDate,
        dateKey: nDateKey,
        isCurrentMonth: false,
        isToday: nDateKey === todayDateKey,
        isPast,
        schedules: scheds
      });
    }

    return days;
  });

  prevMonth(): void {
    let m = this.selectedMonth() - 1;
    let y = this.selectedYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
  }

  nextMonth(): void {
    let m = this.selectedMonth() + 1;
    let y = this.selectedYear();
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
  }

  goToCurrentMonth(): void {
    const now = new Date();
    this.selectedYear.set(now.getFullYear());
    this.selectedMonth.set(now.getMonth());
  }

  openDayModal(day: CalendarDay): void {
    this.selectedDay.set(day);
    this.editingSchedule.set(null);
    this.deletingSchedule.set(null);
    this.deletionRefundSummary.set(null);
  }

  closeDayModal(): void {
    this.selectedDay.set(null);
    this.editingSchedule.set(null);
    this.deletingSchedule.set(null);
    this.deletionRefundSummary.set(null);
  }

  isSchedulePast(schedule: Schedule): boolean {
    const now = new Date();
    if (schedule.fechaHoraInicio) {
      const d = new Date(schedule.fechaHoraInicio);
      if (!isNaN(d.getTime())) {
        return d.getTime() < now.getTime();
      }
    }
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [h, m] = schedule.time.split(':').map(Number);
    const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0);
    return schedDate.getTime() < now.getTime();
  }

  formatDayTitle(date: Date): string {
    const formatted = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Client mode: Select schedule for purchase
  onSelectSchedule(schedule: Schedule): void {
    const currentMovie = this.movie;
    if (currentMovie && !this.isSchedulePast(schedule)) {
      this.closeDayModal();
      this.scheduleSelected.emit({ movie: currentMovie, schedule });
    }
  }

  // Admin mode: Edit schedule
  startEditingSchedule(schedule: Schedule): void {
    this.editingSchedule.set(schedule);
    this.editTime = schedule.time || '17:00';
    this.editSalaId = schedule.salaId || 1;
    this.editRoom = schedule.room || 'Sala 1';
    this.editFormat = schedule.format || '2D';
    this.editLanguage = schedule.language || 'Castellano';
    this.editBasePrice = schedule.basePrice || 5500;
    this.editIsPresale = !!schedule.isPresale;
    this.editPresalePrice = schedule.presalePrice || 4500;

    if (schedule.fechaHoraInicio) {
      const d = new Date(schedule.fechaHoraInicio);
      if (!isNaN(d.getTime())) {
        this.editDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        this.editDateStr = this.selectedDay()?.dateKey || new Date().toISOString().split('T')[0];
      }
    } else {
      this.editDateStr = this.selectedDay()?.dateKey || new Date().toISOString().split('T')[0];
    }
  }

  cancelEditing(): void {
    this.editingSchedule.set(null);
  }

  onSalaChange(salaIdStr: string): void {
    const salaId = Number(salaIdStr);
    this.editSalaId = salaId;
    const found = this.availableSalas().find(s => s.id === salaId);
    if (found) {
      this.editRoom = found.nombre;
    }
  }

  async saveEditedSchedule(): Promise<void> {
    const currentMovie = this.movie;
    const currentSched = this.editingSchedule();
    if (!currentMovie || !currentSched) return;

    this.isSavingEdit.set(true);
    try {
      const [h, min] = this.editTime.split(':');
      const formattedTime = `${String(h || '17').padStart(2, '0')}:${String(min || '00').padStart(2, '0')}`;
      const dateTimeIso = `${this.editDateStr}T${formattedTime}:00`;

      const updated: Schedule = {
        ...currentSched,
        time: formattedTime,
        salaId: this.editSalaId,
        room: this.editRoom,
        format: this.editFormat,
        language: this.editLanguage,
        basePrice: Number(this.editBasePrice) || 5500,
        isPresale: this.editIsPresale,
        presalePrice: this.editIsPresale ? (Number(this.editPresalePrice) || 4500) : undefined,
        fechaHoraInicio: dateTimeIso
      };

      await this.movieService.updateSchedule(currentMovie.id, updated);
      this.adminService.addAuditLog(
        'modificar_funcion',
        'Funciones',
        `Modificó datos de función (${updated.time} hs, ${updated.room}, ${updated.format}) de "${currentMovie.title}".`
      );

      this.scheduleUpdated.emit({ movie: currentMovie, schedule: updated });

      // Refresh current day view
      if (this.selectedDay()) {
        const curDay = this.selectedDay()!;
        const updatedSchedules = curDay.schedules.map(s => s.id === updated.id ? updated : s);
        this.selectedDay.set({ ...curDay, schedules: updatedSchedules });
      }

      this.editingSchedule.set(null);
    } catch (err) {
      console.error('Error al actualizar función:', err);
    } finally {
      this.isSavingEdit.set(false);
    }
  }

  // Admin mode: Delete schedule with refund
  startDeletingSchedule(schedule: Schedule): void {
    this.deletingSchedule.set(schedule);
    this.deletionRefundSummary.set(null);
  }

  cancelDeleting(): void {
    this.deletingSchedule.set(null);
    this.deletionRefundSummary.set(null);
  }

  async confirmDeleteSchedule(): Promise<void> {
    const currentMovie = this.movie;
    const sched = this.deletingSchedule();
    if (!currentMovie || !sched) return;

    this.isDeletingSchedule.set(true);
    try {
      const result = await this.movieService.removeSchedule(currentMovie.id, sched.id);
      this.adminService.addAuditLog(
        'eliminar_funcion',
        'Funciones',
        `Eliminó la función de las ${sched.time} en ${sched.room} de "${currentMovie.title}" (Reembolsos a ${result.refundedCount} usuarios: $${result.refundedAmount.toLocaleString('es-AR')}).`
      );

      this.scheduleDeleted.emit({ movie: currentMovie, schedule: sched });

      // Refresh current day view
      if (this.selectedDay()) {
        const curDay = this.selectedDay()!;
        const remaining = curDay.schedules.filter(s => s.id !== sched.id);
        this.selectedDay.set({ ...curDay, schedules: remaining });
      }

      this.deletionRefundSummary.set({
        count: result.refundedCount,
        amount: result.refundedAmount
      });
      this.deletingSchedule.set(null);
    } catch (err) {
      console.error('Error al eliminar función con reembolso:', err);
    } finally {
      this.isDeletingSchedule.set(false);
    }
  }
}
