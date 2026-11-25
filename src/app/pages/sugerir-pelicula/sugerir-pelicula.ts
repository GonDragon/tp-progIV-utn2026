import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SuggestionService } from '../../services/suggestion.service';
import { MovieSuggestion } from '../../models/movie-suggestion';

@Component({
  selector: 'app-sugerir-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sugerir-pelicula.html',
  styleUrl: './sugerir-pelicula.css'
})
export class SugerirPelicula implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly suggestionService = inject(SuggestionService);
  private readonly router = inject(Router);

  readonly pendingSuggestion = signal<MovieSuggestion | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  titulo = '';
  descripcion = '';
  explicacion_cine = '';

  async ngOnInit(): Promise<void> {
    await this.loadUserPendingSuggestion();
  }

  async loadUserPendingSuggestion(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.isLoading.set(false);
        return;
      }

      const { data, error } = await this.suggestionService.getPendingSuggestionByUser(user.id);
      if (error) {
        this.errorMessage.set('No se pudo verificar el estado de tus sugerencias.');
      } else {
        this.pendingSuggestion.set(data);
      }
    } catch (err) {
      console.error('Error al cargar sugerencia pendiente:', err);
      this.errorMessage.set('Ocurrió un error al cargar la información.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.titulo.trim()) {
      this.errorMessage.set('Por favor, ingresa el título de la película.');
      return;
    }
    if (!this.descripcion.trim()) {
      this.errorMessage.set('Por favor, ingresa una descripción de la película.');
      return;
    }
    if (!this.explicacion_cine.trim()) {
      this.errorMessage.set('Por favor, ingresa una explicación de por qué la quieres en el cine.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const result = await this.suggestionService.createSuggestion({
        perfil_id: user.id,
        titulo: this.titulo.trim(),
        descripcion: this.descripcion.trim(),
        explicacion_cine: this.explicacion_cine.trim()
      });

      if (!result.success || !result.data) {
        this.errorMessage.set(result.error || 'No se pudo enviar la sugerencia.');
      } else {
        this.pendingSuggestion.set(result.data);
        this.titulo = '';
        this.descripcion = '';
        this.explicacion_cine = '';
        this.successMessage.set('¡Tu sugerencia fue enviada exitosamente!');
      }
    } catch (err: any) {
      console.error('Error al enviar sugerencia:', err);
      this.errorMessage.set(err.message || 'Error al enviar la sugerencia.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
