import { Component, input, output } from '@angular/core';
import { Movie, Schedule } from '../../models/movie';

@Component({
  selector: 'app-highlighted-movies',
  standalone: true,
  templateUrl: './highlighted-movies.html',
  styleUrl: './highlighted-movies.css'
})
export class HighlightedMovies {
  readonly movies = input.required<Movie[]>();
  readonly scheduleSelected = output<{ movie: Movie; schedule: Schedule }>();

  onSelectSchedule(movie: Movie, schedule: Schedule): void {
    this.scheduleSelected.emit({ movie, schedule });
  }
}
