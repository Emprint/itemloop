import { Component, effect, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../auth/auth-response';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private authService = inject(AuthService);
  readonly links = signal<{ label: string; route: string }[]>([]);
  public translate = inject(TranslateService);
  public showMenu = signal(false);
  public get currentLang() {
    return this.translate.currentLang;
  }

  constructor() {
    const updateLinks = () => {
      const user = this.authService.user();
      this.links.set(this.generateLinks(user));
    };
    effect(updateLinks);
    this.translate.onLangChange.subscribe(updateLinks);
  }

  switchLang(lang: string) {
    this.translate.use(lang);
  }

  toggleMenu() {
    this.showMenu.update((v) => !v);
  }

  closeMenu() {
    this.showMenu.set(false);
  }

  private generateLinks(user: User | null) {
    const links = [
      { label: 'PRODUCTS', route: '/products' },
      { label: 'CART', route: '/cart' },
    ];

    if (!user) {
      links.push({ label: 'LOGIN', route: '/auth/login' });
      return links;
    }

    if (user.role === 'editor' || user.role === 'admin') {
      links.push({ label: 'LOCATIONS', route: '/locations' });
    }

    if (user.role === 'admin') {
      links.push({ label: 'USERS', route: '/admin/users' });
    }

    // Add a logout link for logged-in users
    links.push({ label: 'LOGOUT', route: '' });

    return links;
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
