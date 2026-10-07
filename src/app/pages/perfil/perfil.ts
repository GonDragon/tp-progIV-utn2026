import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth';
import { ActiveTicketItem } from '../../models/profile';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly selectedQrTicket = signal<ActiveTicketItem | null>(null);

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfileData();
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
