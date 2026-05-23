import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AppSettingsService, AppSettings } from '../app-settings.service';
import { SUPPORTED_LOCALES, SUPPORTED_CURRENCIES } from './locales';

@Component({
  selector: 'app-admin-app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss'],
})
export class AppSettingsComponent implements OnInit {
  private settingsService = inject(AppSettingsService);
  private cdr = inject(ChangeDetectorRef);

  private _settings = signal<AppSettings>({});
  loading = false;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;

  readonly settings = this._settings.asReadonly();
  openRegistrationEnabled = computed(() => this.settings()['open_registration'] === '1');
  publicModeEnabled = computed(() => this.settings()['public_mode'] === '1');
  shopModeEnabled = computed(() => this.settings()['shop_mode'] === '1');
  readonly supportedCurrencies = SUPPORTED_CURRENCIES;
  readonly supportedLocales = SUPPORTED_LOCALES;

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this._settings.set(data);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Failed to load settings.';
          this.cdr.markForCheck();
        },
      });
  }

  onOpenRegistrationChange(checked: boolean): void {
    this._settings.update((s) => ({ ...s, open_registration: checked ? '1' : '0' }));
  }

  onPublicModeChange(checked: boolean): void {
    this._settings.update((s) => ({ ...s, public_mode: checked ? '1' : '0' }));
  }

  onShopModeChange(checked: boolean): void {
    this._settings.update((s) => ({ ...s, shop_mode: checked ? '1' : '0' }));
  }

  saveSettings(): void {
    this.saving = true;
    this.error = null;
    this.successMessage = null;

    this.settingsService
      .update(this.settings())
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.successMessage = 'Settings updated successfully!';
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            this.error = 'Failed to update settings.';
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'An error occurred while saving.';
          this.cdr.markForCheck();
        },
      });
  }
}
