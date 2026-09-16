import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  imports: [RouterOutlet],
  selector: 'app-layout',
  standalone: true,
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {
  readonly authService = inject(AuthService);
}
