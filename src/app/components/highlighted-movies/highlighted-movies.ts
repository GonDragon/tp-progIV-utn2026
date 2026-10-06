import { Component, input, output } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-highlighted-movies',
  standalone: true,
  templateUrl: './highlighted-movies.html',
  styleUrl: './highlighted-movies.css'
})
export class HighlightedMovies {
  readonly movies = input.required<Movie[]>();
  readonly movieSelected = output<Movie>();

  onSelectMovie(movie: Movie): void {
    this.movieSelected.emit(movie);
  }
}
