import { Component, signal, inject, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';
import { RouterOutlet } from '@angular/router';
import { DropdownService } from './shared/dropdown.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);
  protected dropdown = inject(DropdownService);
  private http = inject(HttpClient);

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
    this.initializeLanguage(translate);
  }

  private async initializeLanguage(translate: TranslateService): Promise<void> {
    try {
      const settings = await firstValueFrom(this.http.get<Record<string, string>>('/api/settings'));
      const languageMode = settings['language_mode'] || 'multi';
      const fixedLocale = settings['fixed_locale'] || 'en';

      if (languageMode === 'single') {
        translate.use(fixedLocale);
      } else {
        const browserLang = translate.getBrowserLang() ?? 'en';
        const lang = ['fr', 'en'].includes(browserLang) ? browserLang : 'en';
        translate.use(lang);
      }
    } catch {
      const browserLang = translate.getBrowserLang() ?? 'en';
      const lang = ['fr', 'en'].includes(browserLang) ? browserLang : 'en';
      translate.use(lang);
    }
  }
}
