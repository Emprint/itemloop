import { Component, computed, effect, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);

  readonly user = this.authService.user;
  readonly sidebarOpen = signal(false);

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
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

  get currentLang() {
    return this.translateService.currentLang;
  }

  switchLang(lang: string) {
    this.translateService.use(lang);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
