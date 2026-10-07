import { Component, input, output, signal } from '@angular/core';
import { Movie, Schedule } from '../../../../../../models/movie';
import { MovieScheduleCalendar } from '../../../../../../components/movie-schedule-calendar/movie-schedule-calendar';

@Component({
  selector: 'app-movie-list-item',
  standalone: true,
  imports: [MovieScheduleCalendar],
  templateUrl: './movie-list-item.html',
  styleUrl: './movie-list-item.css'
})
export class MovieListItem {
  readonly movie = input.required<Movie>();

  readonly schedule = output<Movie>();
  readonly edit = output<Movie>();
  readonly delete = output<Movie>();
  readonly toggleVisibility = output<Movie>();
  readonly removeSchedule = output<{ movie: Movie; schedule: Schedule }>();
  readonly updateSchedule = output<{ movie: Movie; schedule: Schedule }>();

  readonly showCalendar = signal<boolean>(false);

  toggleCalendar(): void {
    this.showCalendar.update(v => !v);
  }

  onSchedule(): void {
    this.schedule.emit(this.movie());
  }

  onEdit(): void {
    this.edit.emit(this.movie());
  }

  onDelete(): void {
    this.delete.emit(this.movie());
  }

  onToggleVisibility(): void {
    this.toggleVisibility.emit(this.movie());
  }

  onRemoveSchedule(schedule: Schedule): void {
    this.removeSchedule.emit({ movie: this.movie(), schedule });
  }

  onScheduleDeleted(event: { movie: Movie; schedule: Schedule }): void {
    this.removeSchedule.emit(event);
  }

  onScheduleUpdated(event: { movie: Movie; schedule: Schedule }): void {
    this.updateSchedule.emit(event);
  }
}
