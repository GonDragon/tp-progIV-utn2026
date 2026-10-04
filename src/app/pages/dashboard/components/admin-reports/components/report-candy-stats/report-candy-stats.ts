import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandySalesStat } from '../../../../../../models/reports';

@Component({
  selector: 'app-report-candy-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-candy-stats.html',
  styleUrl: './report-candy-stats.css'
})
export class ReportCandyStats {
  readonly stats = input.required<CandySalesStat[]>();
}
