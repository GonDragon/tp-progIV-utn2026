import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-movie-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './movie-filter.html',
  styleUrl: './movie-filter.css'
})
export class MovieFilter {
  readonly genres = input.required<string[]>();
  readonly selectedGenres = input.required<string[]>();
  readonly searchQuery = input.required<string>();

  readonly searchChange = output<string>();
  readonly genreToggled = output<string>();
  readonly clearFilters = output<void>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onToggleGenre(genre: string): void {
    this.genreToggled.emit(genre);
  }

  onClear(): void {
    this.clearFilters.emit();
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres().includes(genre);
  }
}
