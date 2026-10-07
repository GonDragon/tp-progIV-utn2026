import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-highlighted-movies',
  standalone: true,
  templateUrl: './highlighted-movies.html',
  styleUrl: './highlighted-movies.css'
})
export class HighlightedMovies {
  @Input({ required: true }) movies: Movie[] = [];
  @Output() movieSelected = new EventEmitter<Movie>();

  onSelectMovie(movie: Movie): void {
    this.movieSelected.emit(movie);
  }
}
