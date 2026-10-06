import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MovieService } from '../../services/movie.service';
import { HighlightedMovies } from '../../components/highlighted-movies/highlighted-movies';
import { MovieFilter } from '../../components/movie-filter/movie-filter';
import { MovieCard } from '../../components/movie-card/movie-card';
import { UpcomingMovies } from '../../components/upcoming-movies/upcoming-movies';
import { MovieDetailModal } from '../../components/movie-detail-modal/movie-detail-modal';
import { PurchaseFlow } from '../../components/purchase-flow/purchase-flow';
import { Movie, Schedule } from '../../models/movie';
import { CompletedPurchaseResult } from '../../models/purchase';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [
    HighlightedMovies,
    MovieFilter,
    MovieCard,
    UpcomingMovies,
    MovieDetailModal,
    PurchaseFlow
  ],
  templateUrl: './principal.html',
  styleUrl: './principal.css',
})
export class Principal {
  readonly authService = inject(AuthService);
  readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly selectedMovie = signal<Movie | null>(null);
  readonly purchaseMovie = signal<Movie | null>(null);
  readonly purchaseSchedule = signal<Schedule | null>(null);

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
    // Closes movie details modal and launches the step-by-step purchase flow
    this.selectedMovie.set(null);
    this.purchaseMovie.set(event.movie);
    this.purchaseSchedule.set(event.schedule);
  }

  onClosePurchaseFlow(): void {
    this.purchaseMovie.set(null);
    this.purchaseSchedule.set(null);
  }

  onPurchaseCompleted(result: CompletedPurchaseResult): void {
    // Refresh movie data to update tickets sold and top selling stats from Supabase
    this.movieService.loadMovies();
  }
}
