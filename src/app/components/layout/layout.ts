import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-layout',
  standalone: true,
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {}
