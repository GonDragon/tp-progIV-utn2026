import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth';
import { ReviewService } from '../../services/review.service';
import { MovieService } from '../../services/movie.service';
import { ActiveTicketItem, WatchedMovieItem } from '../../models/profile';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  readonly reviewService = inject(ReviewService);
  readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly selectedQrTicket = signal<ActiveTicketItem | null>(null);
  readonly refundFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly isRefundingId = signal<number | null>(null);

  // Estados para modal de escribir reseña
  readonly selectedReviewMovie = signal<WatchedMovieItem | null>(null);
  readonly reviewRating = signal<number>(5);
  readonly reviewComment = signal<string>('');
  readonly isSubmittingReview = signal<boolean>(false);
  readonly reviewError = signal<string | null>(null);
  readonly reviewSuccess = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfileData();
  }

  openReviewModal(movie: WatchedMovieItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedReviewMovie.set(movie);
    this.reviewRating.set(5);
    this.reviewComment.set('');
    this.reviewError.set(null);
    this.reviewSuccess.set(null);
  }

  closeReviewModal(): void {
    if (this.isSubmittingReview()) return;
    this.selectedReviewMovie.set(null);
    this.reviewError.set(null);
    this.reviewSuccess.set(null);
  }

  setRating(rating: number): void {
    this.reviewRating.set(rating);
  }

  async submitReview(): Promise<void> {
    const movie = this.selectedReviewMovie();
    const user = this.authService.currentUser();
    if (!movie || !user) {
      this.reviewError.set('No se pudo identificar la película o el usuario.');
      return;
    }

    const rating = this.reviewRating();
    const comment = this.reviewComment().trim();

    if (!comment) {
      this.reviewError.set('Por favor, escribe un comentario para tu reseña.');
      return;
    }

    if (rating < 1 || rating > 5) {
      this.reviewError.set('La calificación debe ser de 1 a 5 estrellas.');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewError.set(null);

    try {
      const res = await this.reviewService.addReview({
        pelicula_id: movie.id,
        perfil_id: user.id,
        calificacion: rating,
        comentario: comment
      });

      if (!res.success) {
        this.reviewError.set(res.error || 'Ocurrió un error al guardar tu reseña.');
        return;
      }

      this.reviewSuccess.set('¡Tu reseña ha sido publicada con éxito!');
      // Refrescar perfil para actualizar estado de películas vistas
      await this.profileService.loadProfileData();
      // Refrescar películas para actualizar promedio de calificaciones
      await this.movieService.loadMovies();

      setTimeout(() => {
        this.closeReviewModal();
      }, 1200);
    } catch (e: any) {
      this.reviewError.set(e?.message || 'Error inesperado al guardar la reseña.');
    } finally {
      this.isSubmittingReview.set(false);
    }
  }

  canRefundTicket(ticket: ActiveTicketItem): boolean {
    if (!ticket.schedule?.dateTimeRaw) return false;
    const showtime = new Date(ticket.schedule.dateTimeRaw).getTime();
    if (isNaN(showtime)) return false;
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    return (showtime - now) >= twoHoursInMs;
  }

  getRefundDisabledReason(ticket: ActiveTicketItem): string {
    if (!ticket.schedule?.dateTimeRaw) return 'Horario no definido';
    const showtime = new Date(ticket.schedule.dateTimeRaw).getTime();
    if (isNaN(showtime)) return 'Horario inválido';
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    if (showtime - now <= 0) {
      return 'Función ya iniciada';
    }
    if ((showtime - now) < twoHoursInMs) {
      return 'Devolución no disponible (< 2h de la función)';
    }
    return '';
  }

  async onAutoRefund(ticket: ActiveTicketItem, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canRefundTicket(ticket) || this.isRefundingId() !== null) {
      return;
    }

    const confirmRefund = confirm(`¿Deseas solicitar la devolución automática de esta entrada? Se devolverá el total de la transacción ($${ticket.transaccion.montoTotal.toLocaleString('es-AR')}) como saldo a favor en tu cuenta.`);
    if (!confirmRefund) return;

    this.isRefundingId.set(ticket.id);
    this.refundFeedback.set(null);

    try {
      const res = await this.profileService.autoRefundTicket(ticket.id);
      if (res.success) {
        this.refundFeedback.set({
          type: 'success',
          message: res.message
        });
      } else {
        this.refundFeedback.set({
          type: 'error',
          message: res.message
        });
      }
    } finally {
      this.isRefundingId.set(null);
    }
  }

  dismissRefundFeedback(): void {
    this.refundFeedback.set(null);
  }

  async onDownloadPdf(ticket: ActiveTicketItem, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.profileService.downloadTicketPdf(ticket);
  }

  openQrModal(ticket: ActiveTicketItem): void {
    this.selectedQrTicket.set(ticket);
  }

  closeQrModal(): void {
    this.selectedQrTicket.set(null);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'No especificada';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].substring(0, 2);
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatMemberSince(dateStr?: string): string {
    if (!dateStr) return 'Reciente';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    } catch {
      return 'Reciente';
    }
  }
}
