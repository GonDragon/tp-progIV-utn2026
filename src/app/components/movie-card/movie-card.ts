import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  @Input({ required: true }) movie!: Movie;
  @Output() movieSelected = new EventEmitter<Movie>();

  onSelectMovie(): void {
    this.movieSelected.emit(this.movie);
  }
}
