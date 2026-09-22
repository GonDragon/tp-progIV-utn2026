import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MovieService } from '../../services/movie.service';
import { HighlightedMovies } from '../../components/highlighted-movies/highlighted-movies';
import { MovieFilter } from '../../components/movie-filter/movie-filter';
import { MovieCard } from '../../components/movie-card/movie-card';
import { UpcomingMovies } from '../../components/upcoming-movies/upcoming-movies';
import { Movie, Schedule } from '../../models/movie';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [
    HighlightedMovies,
    MovieFilter,
    MovieCard,
    UpcomingMovies
  ],
  templateUrl: './principal.html',
  styleUrl: './principal.css',
})
export class Principal {
  readonly authService = inject(AuthService);
  readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly selectedScheduleToast = signal<{ movieTitle: string; time: string; format: string; room: string } | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
        this.router.navigate(['/dashboard']);
      }
    });
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
  }
}
