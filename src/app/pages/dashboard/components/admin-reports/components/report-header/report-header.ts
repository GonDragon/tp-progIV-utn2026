import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportTimeframe } from '../../../../../../models/reports';

@Component({
  selector: 'app-report-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-header.html',
  styleUrl: './report-header.css'
})
export class ReportHeader {
  readonly timeframe = input.required<ReportTimeframe>();
  readonly isLoading = input<boolean>(false);

  readonly timeframeChange = output<ReportTimeframe>();
  readonly refresh = output<void>();
  readonly exportExcel = output<void>();
  readonly exportCsv = output<void>();
  readonly exportPdf = output<void>();
  readonly openNewSale = output<void>();
}
