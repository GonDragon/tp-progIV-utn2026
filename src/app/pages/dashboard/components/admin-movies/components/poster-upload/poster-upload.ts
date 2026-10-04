import { Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../../../../../services/movie.service';

@Component({
  selector: 'app-poster-upload',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './poster-upload.html',
  styleUrl: './poster-upload.css'
})
export class PosterUpload {
  private readonly movieService = inject(MovieService);

  readonly imageUrl = model<string>('');
  readonly isUploading = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadError.set(null);
    this.isUploading.set(true);

    try {
      const publicUrl = await this.movieService.uploadPoster(file);
      this.imageUrl.set(publicUrl);
    } catch (err: any) {
      console.error('Error al subir póster:', err);
      this.uploadError.set(err.message || 'Error al subir la imagen a Supabase');
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  removePoster(): void {
    this.imageUrl.set('');
    this.uploadError.set(null);
  }
}
