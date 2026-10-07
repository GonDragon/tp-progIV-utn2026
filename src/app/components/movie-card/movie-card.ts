import { Component, input, output } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  readonly movie = input.required<Movie>();
  readonly movieSelected = output<Movie>();

  onSelectMovie(): void {
    this.movieSelected.emit(this.movie());
  }
}
