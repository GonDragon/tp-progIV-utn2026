import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieViewStat } from '../../../../../../models/reports';

@Component({
  selector: 'app-report-movie-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-movie-stats.html',
  styleUrl: './report-movie-stats.css'
})
export class ReportMovieStats {
  readonly stats = input.required<MovieViewStat[]>();
  readonly movieChartTimeframe = input.required<'weekly' | 'monthly'>();
  readonly timeframeChange = output<'weekly' | 'monthly'>();
}
