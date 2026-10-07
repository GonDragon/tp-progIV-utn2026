import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-upcoming-movies',
  standalone: true,
  templateUrl: './upcoming-movies.html',
  styleUrl: './upcoming-movies.css'
})
export class UpcomingMovies {
  @Input({ required: true }) upcomingMovies: Movie[] = [];
  @Output() alertToggled = new EventEmitter<string>();

  onToggleAlert(movieId: string): void {
    this.alertToggled.emit(movieId);
  }
}
