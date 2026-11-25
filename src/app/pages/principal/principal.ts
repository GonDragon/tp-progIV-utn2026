import { Component, inject, effect, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MovieService } from '../../services/movie.service';
import { HighlightedMovies } from '../../components/highlighted-movies/highlighted-movies';
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
    RouterLink,
    HighlightedMovies,
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
  private readonly route = inject(ActivatedRoute);

  readonly selectedMovie = signal<Movie | null>(null);
  readonly purchaseMovie = signal<Movie | null>(null);
  readonly purchaseSchedule = signal<Schedule | null>(null);
  readonly relocationNotice = signal<{ movieId?: string; movieTitle?: string } | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado' || user.rol === 'auditor')) {
        this.router.navigate(['/dashboard']);
      }
    });

    // Check query params for relocation after cancelled function
    this.route.queryParams.subscribe((params) => {
      const peliculaId = params['pelicula_id'] || params['peliculaId'] || params['pelicula'];
      const isReubicar = params['reubicar'] === 'true' || params['reubicar'] === true;

      if (peliculaId) {
        const found = this.movieService.allMovies().find((m) => String(m.id) === String(peliculaId));
        if (found) {
          this.selectedMovie.set(found);
          if (isReubicar || (this.authService.currentUser()?.saldo_favor || 0) > 0) {
            this.relocationNotice.set({ movieId: found.id, movieTitle: found.title });
          }
        }
      }
    });
  }

  onMovieSelected(movie: Movie): void {
    this.selectedMovie.set(movie);
  }

  onCloseMovieModal(): void {
    this.selectedMovie.set(null);
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

  goToSearch(): void {
    this.router.navigate(['/busqueda']);
  }
}
