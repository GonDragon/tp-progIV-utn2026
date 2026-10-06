import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MovieService } from '../../services/movie.service';
import { HighlightedMovies } from '../../components/highlighted-movies/highlighted-movies';
import { MovieFilter } from '../../components/movie-filter/movie-filter';
import { MovieCard } from '../../components/movie-card/movie-card';
import { UpcomingMovies } from '../../components/upcoming-movies/upcoming-movies';
import { MovieDetailModal } from '../../components/movie-detail-modal/movie-detail-modal';
import { Movie, Schedule } from '../../models/movie';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [
    HighlightedMovies,
    MovieFilter,
    MovieCard,
    UpcomingMovies,
    MovieDetailModal
  ],
  templateUrl: './principal.html',
  styleUrl: './principal.css',
})
export class Principal {
  readonly authService = inject(AuthService);
  readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly selectedMovie = signal<Movie | null>(null);
  readonly selectedScheduleToast = signal<{ movieTitle: string; time: string; format: string; room: string } | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  onMovieSelected(movie: Movie): void {
    this.selectedMovie.set(movie);
  }

  onCloseMovieModal(): void {
    this.selectedMovie.set(null);
  }

  onSearchChange(query: string): void {
    this.movieService.setSearchQuery(query);
  }

  onGenreToggled(genre: string): void {
    this.movieService.toggleGenre(genre);
  }

  onClearFilters(): void {
    this.movieService.setSearchQuery('');
    this.movieService.clearGenreFilters();
  }

  onToggleUpcomingAlert(movieId: string): void {
    this.movieService.toggleUpcomingAlert(movieId);
  }

  onScheduleSelected(event: { movie: Movie; schedule: Schedule }): void {
    this.selectedMovie.set(null);
    this.selectedScheduleToast.set({
      movieTitle: event.movie.title,
      time: event.schedule.time,
      format: event.schedule.format,
      room: event.schedule.room
    });

    // Auto dismiss toast after 4 seconds
    setTimeout(() => {
      this.selectedScheduleToast.set(null);
    }, 4000);
  }

  closeToast(): void {
    this.selectedScheduleToast.set(null);
  }
}
