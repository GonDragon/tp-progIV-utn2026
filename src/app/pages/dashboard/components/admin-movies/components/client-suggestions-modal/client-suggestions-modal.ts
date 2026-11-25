import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuggestionService } from '../../../../../../services/suggestion.service';
import { AdminService } from '../../../../../../services/admin.service';
import { MovieSuggestion } from '../../../../../../models/movie-suggestion';

@Component({
  selector: 'app-client-suggestions-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-suggestions-modal.html',
  styleUrl: './client-suggestions-modal.css'
})
export class ClientSuggestionsModal implements OnInit {
  private readonly suggestionService = inject(SuggestionService);
  private readonly adminService = inject(AdminService);

  readonly close = output<void>();
  readonly accept = output<MovieSuggestion>();

  readonly suggestions = signal<MovieSuggestion[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly currentSuggestion = computed(() => {
    const list = this.suggestions();
    const idx = this.currentIndex();
    if (idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  readonly totalSuggestions = computed(() => this.suggestions().length);
  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() < this.suggestions().length - 1);

  async ngOnInit(): Promise<void> {
    await this.loadPendingSuggestions();
  }

  async loadPendingSuggestions(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const { data, error } = await this.suggestionService.getPendingSuggestions();
      if (error) {
        this.errorMessage.set('Error al cargar sugerencias de clientes.');
      } else {
        this.suggestions.set(data || []);
        this.currentIndex.set(0);
      }
    } catch (err: any) {
      console.error('Error al cargar sugerencias:', err);
      this.errorMessage.set('Error al cargar sugerencias.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToPrevious(): void {
    if (this.hasPrevious()) {
      this.currentIndex.update(i => i - 1);
    }
  }

  goToNext(): void {
    if (this.hasNext()) {
      this.currentIndex.update(i => i + 1);
    }
  }

  async handleReject(): Promise<void> {
    const current = this.currentSuggestion();
    if (!current || this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      const result = await this.suggestionService.markAsReviewed(current.id);
      if (result.success) {
        this.adminService.addAuditLog(
          'modificar_pelicula',
          'Sugerencias',
          `Rechazó la sugerencia de película "${current.titulo}".`
        );

        const updated = this.suggestions().filter(s => s.id !== current.id);
        this.suggestions.set(updated);
        if (this.currentIndex() >= updated.length) {
          this.currentIndex.set(Math.max(0, updated.length - 1));
        }
      } else {
        alert(result.error || 'No se pudo rechazar la sugerencia.');
      }
    } catch (err) {
      console.error('Error al rechazar sugerencia:', err);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async handleAccept(): Promise<void> {
    const current = this.currentSuggestion();
    if (!current || this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      const result = await this.suggestionService.markAsReviewed(current.id);
      if (result.success) {
        this.adminService.addAuditLog(
          'crear_pelicula',
          'Sugerencias',
          `Aceptó la sugerencia de película "${current.titulo}" para crearla en el catálogo.`
        );
        this.accept.emit(current);
      } else {
        alert(result.error || 'No se pudo aceptar la sugerencia.');
      }
    } catch (err) {
      console.error('Error al aceptar sugerencia:', err);
    } finally {
      this.isProcessing.set(false);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
