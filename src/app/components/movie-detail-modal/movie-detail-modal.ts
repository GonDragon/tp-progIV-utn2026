import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../models/movie';

export interface DayScheduleGroup {
  dayLabel: string;
  dateKey: string;
  schedules: Schedule[];
}

@Component({
  selector: 'app-movie-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movie-detail-modal.html',
  styleUrl: './movie-detail-modal.css'
})
export class MovieDetailModal {
  readonly movie = input<Movie | null>(null);
  readonly close = output<void>();
  readonly scheduleSelected = output<{ movie: Movie; schedule: Schedule }>();

  readonly dayScheduleGroups = computed<DayScheduleGroup[]>(() => {
    const currentMovie = this.movie();
    if (!currentMovie || !currentMovie.schedules || currentMovie.schedules.length === 0) {
      return [];
    }

    const groupsMap = new Map<string, { dayLabel: string; schedules: Schedule[] }>();

    for (const sched of currentMovie.schedules) {
      let dateKey = 'sin-fecha';
      let dayLabel = 'Próximas Funciones';

      if (sched.fechaHoraInicio) {
        const d = new Date(sched.fechaHoraInicio);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);

          const isToday = d.toDateString() === today.toDateString();
          const isTomorrow = d.toDateString() === tomorrow.toDateString();

          const formattedDate = d.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          });

          const capitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

          if (isToday) {
            dayLabel = `Hoy • ${capitalized}`;
          } else if (isTomorrow) {
            dayLabel = `Mañana • ${capitalized}`;
          } else {
            dayLabel = capitalized;
          }
        }
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, { dayLabel, schedules: [] });
      }
      groupsMap.get(dateKey)!.schedules.push(sched);
    }

    const sortedKeys = Array.from(groupsMap.keys()).sort();
    return sortedKeys.map(key => {
      const group = groupsMap.get(key)!;
      group.schedules.sort((a, b) => a.time.localeCompare(b.time));
      return {
        dateKey: key,
        dayLabel: group.dayLabel,
        schedules: group.schedules
      };
    });
  });

  onClose(): void {
    this.close.emit();
  }

  onSelectSchedule(schedule: Schedule): void {
    const currentMovie = this.movie();
    if (currentMovie) {
      this.scheduleSelected.emit({ movie: currentMovie, schedule });
    }
  }
}
