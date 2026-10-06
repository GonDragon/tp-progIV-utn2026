import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditStats as IAuditStats } from '../../../../../../models/audit';

@Component({
  selector: 'app-audit-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-stats.html',
  styleUrl: './audit-stats.css'
})
export class AuditStats {
  readonly stats = input.required<IAuditStats>();
}
