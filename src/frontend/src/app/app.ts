import { Component, signal, inject, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';
import { RouterOutlet } from '@angular/router';
import { DropdownService } from './shared/dropdown.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);
  protected dropdown = inject(DropdownService);

  protected readonly title = signal('itemloop-frontend');

  @HostListener('document:click')
  closeDropdown() {
    this.dropdown.close();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.dropdown.close();
  }

  constructor() {
    this.auth.restoreSession();
    const translate = inject(TranslateService);
    const browserLang = translate.getBrowserLang() ?? 'en';
    const lang = ['fr', 'en'].includes(browserLang) ? browserLang : 'en';
    translate.use(lang);
  }
}
