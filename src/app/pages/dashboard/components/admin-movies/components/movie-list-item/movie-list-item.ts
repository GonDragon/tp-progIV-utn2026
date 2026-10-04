import { Component, input, output } from '@angular/core';
import { Movie, Schedule } from '../../../../../../models/movie';

@Component({
  selector: 'app-movie-list-item',
  standalone: true,
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
}
