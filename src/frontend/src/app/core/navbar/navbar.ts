import { Component, computed, signal, inject, HostListener, OnInit } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { CartService } from '../../cart/cart.service';
import { AppSettingsService, AppSettings } from '../../admin/app-settings.service';
import { UserService } from '../../admin/user.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);
  readonly cartService = inject(CartService);
  private appSettingsService = inject(AppSettingsService);
  private userService = inject(UserService);

  readonly user = this.authService.user;
  readonly sidebarOpen = signal(false);
  readonly settings = toSignal(this.appSettingsService.getAll(), { initialValue: {} as AppSettings });
  readonly pendingCount = signal(0);

  ngOnInit() {
    if (this.isAdmin()) {
      this.userService.getPendingCount().subscribe({
        next: (res) => this.pendingCount.set(res.count),
        error: () => {
          /* noop — badge simply won't show */
        },
      });
    }
  }

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    if (role === UserRole.Admin) return 'Admin';
    if (role === UserRole.Editor) return 'Éditeur';
    return 'Client';
  });

  readonly isEditorOrAdmin = computed(() => {
    const role = this.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  });

  readonly isAdmin = computed(() => this.user()?.role === UserRole.Admin);

  readonly shopModeEnabled = computed(() => this.settings()['shop_mode'] === '1');
  readonly languageMode = computed(() => this.settings()['language_mode'] || 'multi');
  readonly openRegistrationEnabled = computed(() => this.settings()['open_registration'] === '1');

  get currentLang() {
    return this.translateService.currentLang;
  }

  switchLang(lang: string) {
    this.translateService.use(lang);
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  @HostListener('window:resize')
  onResize() {
    if (this.sidebarOpen()) {
      this.sidebarOpen.set(false);
    }
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
