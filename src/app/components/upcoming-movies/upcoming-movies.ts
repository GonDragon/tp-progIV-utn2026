import { Component, input, output } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-upcoming-movies',
  standalone: true,
  templateUrl: './upcoming-movies.html',
  styleUrl: './upcoming-movies.css'
})
export class UpcomingMovies {
  readonly upcomingMovies = input.required<Movie[]>();
  readonly alertToggled = output<string>();

  onToggleAlert(movieId: string): void {
    this.alertToggled.emit(movieId);
  }
}
