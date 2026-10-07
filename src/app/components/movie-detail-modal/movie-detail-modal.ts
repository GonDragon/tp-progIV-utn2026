import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../models/movie';
import { MovieScheduleCalendar } from '../movie-schedule-calendar/movie-schedule-calendar';

@Component({
  selector: 'app-movie-detail-modal',
  standalone: true,
  imports: [CommonModule, MovieScheduleCalendar],
  templateUrl: './movie-detail-modal.html',
  styleUrl: './movie-detail-modal.css'
})
export class MovieDetailModal {
  readonly movie = input<Movie | null>(null);
  readonly close = output<void>();
  readonly scheduleSelected = output<{ movie: Movie; schedule: Schedule }>();

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
