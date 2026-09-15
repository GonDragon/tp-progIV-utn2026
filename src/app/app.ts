import { Component, signal } from '@angular/core';
import { Layout } from "./components/layout/layout";

@Component({
  imports: [Layout],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('CineIV');
}
