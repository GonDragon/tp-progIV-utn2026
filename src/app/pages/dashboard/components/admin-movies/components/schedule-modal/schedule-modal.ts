import { Component, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Movie, Schedule, Sala } from '../../../../../../models/movie';
import { MovieService } from '../../../../../../services/movie.service';
import { AdminService } from '../../../../../../services/admin.service';

export interface CandidateShowtime {
  dateStr: string;
  formattedDate: string;
  time: string;
  endTime: string;
  startDateTimeIso: string;
  startTimestampMs: number;
  endTimestampWithBufferMs: number;
  format: string;
  language: string;
  basePrice: number;
  isPresale: boolean;
  presalePrice?: number;
  roomName?: string;
  salaId?: number;
}

export interface RoomAssignmentGroup {
  roomName: string;
  salaId?: number;
  functions: CandidateShowtime[];
}

interface WeekDayOption {
  id: number; // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  name: string;
  shortName: string;
  selected: boolean;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
  selector: 'app-schedule-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './schedule-modal.html',
  styleUrl: './schedule-modal.css'
})
export class ScheduleModal {
  readonly movieService = inject(MovieService);
  readonly adminService = inject(AdminService);

  readonly movie = input<Movie | null>(null);
  readonly isSaving = input<boolean>(false);

  readonly save = output<Schedule[]>();
  readonly close = output<void>();

  // Configuration modes
  isSingleShowtime = true;

  // Single showtime fields
  singleDate = '';
  scheduleTime = '17:00';

  // Periodic showtime fields
  weekDays: WeekDayOption[] = [
    { id: 1, name: 'Lunes', shortName: 'Lun', selected: false },
    { id: 2, name: 'Martes', shortName: 'Mar', selected: false },
    { id: 3, name: 'Miércoles', shortName: 'Mié', selected: true },
    { id: 4, name: 'Jueves', shortName: 'Jue', selected: false },
    { id: 5, name: 'Viernes', shortName: 'Vie', selected: false },
    { id: 6, name: 'Sábado', shortName: 'Sáb', selected: true },
    { id: 0, name: 'Domingo', shortName: 'Dom', selected: false }
  ];
  startDate = '';
  endDate = '';

  // Formats and attributes
  scheduleFormat: '2D' | '3D' | '4D' | '5D' | string = '2D';
  scheduleLanguage: 'Castellano' | 'Subtitulada' | string = 'Castellano';
  scheduleBasePrice = 5500;

  // Presale fields
  isPresaleEnabled = false;
  presalePrice = 4500;

  // Room allocation state
  hasSearchedRooms = false;
  isSearching = false;
  allocationError: string | null = null;
  roomAssignments: RoomAssignmentGroup[] = [];
  allocatedCandidates: CandidateShowtime[] = [];

  constructor() {
    effect(() => {
      const currentMovie = this.movie();
      if (currentMovie) {
        this.resetForm(currentMovie);
      }
    });
  }

  private resetForm(currentMovie: Movie): void {
    const today = new Date();
    const todayStr = this.formatDateIso(today);

    const oneMonth = new Date(today);
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    const oneMonthStr = this.formatDateIso(oneMonth);

    this.isSingleShowtime = true;
    this.singleDate = todayStr;
    this.scheduleTime = '17:00';

    this.startDate = todayStr;
    this.endDate = oneMonthStr;
    this.weekDays = [
      { id: 1, name: 'Lunes', shortName: 'Lun', selected: false },
      { id: 2, name: 'Martes', shortName: 'Mar', selected: false },
      { id: 3, name: 'Miércoles', shortName: 'Mié', selected: true },
      { id: 4, name: 'Jueves', shortName: 'Jue', selected: false },
      { id: 5, name: 'Viernes', shortName: 'Vie', selected: false },
      { id: 6, name: 'Sábado', shortName: 'Sáb', selected: true },
      { id: 0, name: 'Domingo', shortName: 'Dom', selected: false }
    ];

    this.scheduleFormat = '2D';
    this.scheduleLanguage = 'Castellano';
    this.scheduleBasePrice = currentMovie.regularPrice || 5500;

    this.isPresaleEnabled = false;
    this.presalePrice = currentMovie.presalePrice || Math.round((currentMovie.regularPrice || 5500) * 0.85);

    this.hasSearchedRooms = false;
    this.allocationError = null;
    this.roomAssignments = [];
    this.allocatedCandidates = [];
  }

  onParameterChanged(): void {
    this.hasSearchedRooms = false;
    this.allocationError = null;
    this.roomAssignments = [];
    this.allocatedCandidates = [];
  }

  toggleWeekDay(id: number): void {
    const day = this.weekDays.find(d => d.id === id);
    if (day) {
      day.selected = !day.selected;
      this.onParameterChanged();
    }
  }

  get calculatedEndTime(): string {
    const current = this.movie();
    const duration = current?.duration || 120;
    return this.getCalculatedEndTime(this.scheduleTime, duration);
  }

  get totalCandidatesCount(): number {
    return this.generateCandidateShowtimes().length;
  }

  getCalculatedEndTime(startTime: string, durationMinutes: number): string {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const total = h * 60 + m + (durationMinutes || 120);
    const endH = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const endM = String(total % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  formatDateIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const dayName = DAY_NAMES[dateObj.getDay()] || '';
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dayName} ${dd}/${mm}/${y}`;
  }

  generateCandidateShowtimes(): CandidateShowtime[] {
    const current = this.movie();
    if (!current) return [];

    const duration = current.duration || 120;
    const candidates: CandidateShowtime[] = [];

    if (this.isSingleShowtime) {
      if (!this.singleDate || !this.scheduleTime) return [];

      const [sY, sM, sD] = this.singleDate.split('-').map(Number);
      const [sH, sMin] = this.scheduleTime.split(':').map(Number);
      if (isNaN(sY) || isNaN(sM) || isNaN(sD) || isNaN(sH) || isNaN(sMin)) return [];

      const startDateObj = new Date(sY, sM - 1, sD, sH, sMin, 0);
      const startTimestampMs = startDateObj.getTime();
      const endTimestampWithBufferMs = startTimestampMs + (duration + 30) * 60 * 1000;
      const endTime = this.getCalculatedEndTime(this.scheduleTime, duration);
      const startDateTimeIso = `${this.singleDate}T${this.scheduleTime}:00`;

      candidates.push({
        dateStr: this.singleDate,
        formattedDate: this.formatDateDisplay(this.singleDate),
        time: this.scheduleTime,
        endTime,
        startDateTimeIso,
        startTimestampMs,
        endTimestampWithBufferMs,
        format: this.scheduleFormat,
        language: this.scheduleLanguage,
        basePrice: Number(this.scheduleBasePrice) || 5500,
        isPresale: this.isPresaleEnabled,
        presalePrice: this.isPresaleEnabled ? (Number(this.presalePrice) || 4500) : undefined
      });
    } else {
      const selectedDayIds = this.weekDays.filter(d => d.selected).map(d => d.id);
      if (selectedDayIds.length === 0 || !this.startDate || !this.endDate || !this.scheduleTime) {
        return [];
      }

      const [sY, sM, sD] = this.startDate.split('-').map(Number);
      const [eY, eM, eD] = this.endDate.split('-').map(Number);
      const [sH, sMin] = this.scheduleTime.split(':').map(Number);
      if (isNaN(sY) || isNaN(sM) || isNaN(sD) || isNaN(eY) || isNaN(eM) || isNaN(eD) || isNaN(sH) || isNaN(sMin)) {
        return [];
      }

      const cur = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      if (cur > end) return [];

      const endTime = this.getCalculatedEndTime(this.scheduleTime, duration);
      let isFirst = true;

      while (cur <= end) {
        const dayOfWeek = cur.getDay();
        if (selectedDayIds.includes(dayOfWeek)) {
          const curY = cur.getFullYear();
          const curM = String(cur.getMonth() + 1).padStart(2, '0');
          const curD = String(cur.getDate()).padStart(2, '0');
          const curDateStr = `${curY}-${curM}-${curD}`;
          const curDateObj = new Date(curY, cur.getMonth(), cur.getDate(), sH, sMin, 0);
          const startTimestampMs = curDateObj.getTime();
          const endTimestampWithBufferMs = startTimestampMs + (duration + 30) * 60 * 1000;
          const startDateTimeIso = `${curDateStr}T${this.scheduleTime}:00`;

          candidates.push({
            dateStr: curDateStr,
            formattedDate: this.formatDateDisplay(curDateStr),
            time: this.scheduleTime,
            endTime,
            startDateTimeIso,
            startTimestampMs,
            endTimestampWithBufferMs,
            format: this.scheduleFormat,
            language: this.scheduleLanguage,
            basePrice: Number(this.scheduleBasePrice) || 5500,
            isPresale: isFirst && this.isPresaleEnabled,
            presalePrice: (isFirst && this.isPresaleEnabled) ? (Number(this.presalePrice) || 4500) : undefined
          });

          isFirst = false;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    return candidates;
  }

  searchAvailableRooms(): void {
    const current = this.movie();
    if (!current) return;

    this.isSearching = true;
    this.allocationError = null;

    const candidates = this.generateCandidateShowtimes();
    if (candidates.length === 0) {
      if (!this.isSingleShowtime) {
        const selectedDayIds = this.weekDays.filter(d => d.selected).map(d => d.id);
        if (selectedDayIds.length === 0) {
          this.allocationError = 'Debes seleccionar al menos un día de la semana para transmitir.';
        } else if (!this.startDate || !this.endDate) {
          this.allocationError = 'Debes seleccionar fecha de inicio y de finalización.';
        } else {
          this.allocationError = 'No se encontraron fechas válidas en el rango seleccionado.';
        }
      } else {
        this.allocationError = 'Por favor ingresa una fecha y horario válidos.';
      }
      this.isSearching = false;
      this.hasSearchedRooms = false;
      return;
    }

    // Load available rooms from MovieService
    const dbSalas = this.movieService.salas();
    let availableRooms: Array<{ id?: number; nombre: string }> = [];
    if (dbSalas.length > 0) {
      availableRooms = dbSalas.map(s => ({ id: s.id, nombre: s.nombre }));
    } else {
      availableRooms = [
        { id: 1, nombre: 'Sala 1' },
        { id: 2, nombre: 'Sala 2' },
        { id: 3, nombre: 'Sala 3' },
        { id: 4, nombre: 'Sala 4' },
        { id: 5, nombre: 'Sala 5' }
      ];
    }

    // Build existing bookings map for each room from current movies
    const roomOccupancyMap = new Map<string, Array<{ start: number; end: number; title: string }>>();
    availableRooms.forEach(r => roomOccupancyMap.set(r.nombre.toLowerCase(), []));

    const movies = this.movieService.allMovies();
    movies.forEach(m => {
      m.schedules?.forEach(s => {
        let sStartMs: number | null = null;
        if (s.fechaHoraInicio) {
          const dt = new Date(s.fechaHoraInicio);
          if (!isNaN(dt.getTime())) {
            sStartMs = dt.getTime();
          }
        }
        if (sStartMs !== null) {
          const sEndMs = sStartMs + (m.duration + 30) * 60 * 1000;
          const roomKey = s.room.toLowerCase();
          if (!roomOccupancyMap.has(roomKey)) {
            roomOccupancyMap.set(roomKey, []);
          }
          roomOccupancyMap.get(roomKey)!.push({
            start: sStartMs,
            end: sEndMs,
            title: m.title
          });
        }
      });
    });

    // Allocate room for each candidate
    for (const candidate of candidates) {
      let allocatedRoom: { id?: number; nombre: string } | null = null;

      for (const room of availableRooms) {
        const roomKey = room.nombre.toLowerCase();
        const existingSlots = roomOccupancyMap.get(roomKey) || [];

        // Check overlap with 30 min buffer
        let hasOverlap = false;
        for (const slot of existingSlots) {
          const overlaps = Math.max(candidate.startTimestampMs, slot.start) < Math.min(candidate.endTimestampWithBufferMs, slot.end);
          if (overlaps) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          allocatedRoom = room;
          // Register this slot in roomOccupancyMap
          existingSlots.push({
            start: candidate.startTimestampMs,
            end: candidate.endTimestampWithBufferMs,
            title: current.title
          });
          roomOccupancyMap.set(roomKey, existingSlots);
          break;
        }
      }

      if (allocatedRoom) {
        candidate.roomName = allocatedRoom.nombre;
        candidate.salaId = allocatedRoom.id;
      } else {
        this.allocationError = `No hay salas disponibles con el margen de 30 minutos para la función del ${candidate.formattedDate} a las ${candidate.time} hs.`;
        this.hasSearchedRooms = false;
        this.isSearching = false;
        this.roomAssignments = [];
        this.allocatedCandidates = [];
        return;
      }
    }

    // Group assigned candidates by room
    const groupMap = new Map<string, RoomAssignmentGroup>();
    candidates.forEach(c => {
      const roomKey = c.roomName!;
      if (!groupMap.has(roomKey)) {
        groupMap.set(roomKey, {
          roomName: c.roomName!,
          salaId: c.salaId,
          functions: []
        });
      }
      groupMap.get(roomKey)!.functions.push(c);
    });

    this.roomAssignments = Array.from(groupMap.values());
    this.allocatedCandidates = candidates;
    this.hasSearchedRooms = true;
    this.isSearching = false;
    this.allocationError = null;
  }

  onConfirm(): void {
    const current = this.movie();
    if (!current || !this.hasSearchedRooms || this.allocatedCandidates.length === 0) return;

    const schedulesToSave: Schedule[] = this.allocatedCandidates.map((c, idx) => ({
      id: `s-${Date.now()}-${idx}`,
      time: c.time,
      format: c.format,
      language: c.language,
      room: c.roomName || 'Sala 1',
      salaId: c.salaId,
      basePrice: c.basePrice,
      isPresale: c.isPresale,
      presalePrice: c.presalePrice,
      fechaHoraInicio: c.startDateTimeIso
    }));

    this.save.emit(schedulesToSave);
  }

  onCancel(): void {
    this.close.emit();
  }
}
