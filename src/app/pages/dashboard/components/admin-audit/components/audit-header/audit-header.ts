import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audit-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-header.html',
  styleUrl: './audit-header.css'
})
export class AuditHeader {
  readonly isLoading = input<boolean>(false);
  readonly totalCount = input<number>(0);

  readonly refresh = output<void>();
  readonly openManualModal = output<void>();
}
