import { Component, input, output } from '@angular/core';
import { Movie, Schedule } from '../../models/movie';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  readonly movie = input.required<Movie>();
  readonly scheduleSelected = output<{ movie: Movie; schedule: Schedule }>();

  onSelectSchedule(schedule: Schedule): void {
    this.scheduleSelected.emit({ movie: this.movie(), schedule });
  }
}
