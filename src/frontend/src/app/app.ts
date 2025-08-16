import { Component, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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
    const translate = inject(TranslateService);
    const browserLang = translate.getBrowserLang() ?? 'en';
    const lang = ['fr', 'en'].includes(browserLang) ? browserLang : 'en';
    translate.use(lang);
  }
}
