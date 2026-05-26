import { Component, signal, inject, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DropdownService } from './shared/dropdown.service';
import { HttpClient } from '@angular/common/http';
import { OfflineStorageService } from './shared/offline-storage.service';
import { firstValueFrom, filter } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);
  protected dropdown = inject(DropdownService);
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private swUpdate = environment.serviceWorker ? inject(SwUpdate) : null;

  protected readonly title = signal('itemloop-frontend');
  protected readonly updateAvailable = signal(false);

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
    this.initServiceWorkerUpdates();

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 0);
      });
  }

  private initServiceWorkerUpdates(): void {
    if (!this.swUpdate?.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });

    setInterval(() => this.swUpdate!.checkForUpdate(), 5 * 60 * 1000);
  }

  protected async applyUpdate(): Promise<void> {
    await this.swUpdate?.activateUpdate();
    location.reload();
  }

  private async initializeLanguage(translate: TranslateService): Promise<void> {
    try {
      let settings: Record<string, string>;
      if (!navigator.onLine) {
        settings = (await this.offlineStorage.getCachedSettings()) ?? {};
      } else {
        settings = await firstValueFrom(
          this.http.get<Record<string, string>>('/api/settings'),
        );
        this.offlineStorage.saveSettings(settings);
      }
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
