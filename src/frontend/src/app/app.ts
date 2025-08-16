import { Component, signal, inject } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);

  protected readonly title = signal('itemloop-frontend');

  constructor() {
    this.auth.restoreSession();
  }
}
