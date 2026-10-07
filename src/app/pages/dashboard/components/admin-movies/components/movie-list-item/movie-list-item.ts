import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../../../../../models/movie';
import { MovieScheduleCalendar } from '../../../../../../components/movie-schedule-calendar/movie-schedule-calendar';

@Component({
  selector: 'app-movie-list-item',
  standalone: true,
  imports: [CommonModule, MovieScheduleCalendar],
  templateUrl: './movie-list-item.html',
  styleUrl: './movie-list-item.css'
})
export class MovieListItem {
  @Input({ required: true }) movie!: Movie;

  @Output() schedule = new EventEmitter<Movie>();
  @Output() edit = new EventEmitter<Movie>();
  @Output() delete = new EventEmitter<Movie>();
  @Output() toggleVisibility = new EventEmitter<Movie>();
  @Output() removeSchedule = new EventEmitter<{ movie: Movie; schedule: Schedule }>();

  readonly showCalendar = signal<boolean>(false);

  toggleCalendar(): void {
    this.showCalendar.update(v => !v);
  }

  onScheduleUpdated(event: { movie: Movie; schedule: Schedule }): void {
    // Handled in calendar
  }

  onScheduleDeleted(event: { movie: Movie; schedule: Schedule }): void {
    this.removeSchedule.emit(event);
  }

  onSchedule(): void {
    this.schedule.emit(this.movie);
  }

  onEdit(): void {
    this.edit.emit(this.movie);
  }

  onDelete(): void {
    this.delete.emit(this.movie);
  }

  onToggleVisibility(): void {
    this.toggleVisibility.emit(this.movie);
  }

  onRemoveSchedule(schedule: Schedule): void {
    this.removeSchedule.emit({ movie: this.movie, schedule });
  }
}
