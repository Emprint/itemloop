import { Component, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../auth/auth-response';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private authService = inject(AuthService);

  readonly links = signal<{ label: string; route: string }[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      this.links.set(this.generateLinks(user));
    });
  }

  private generateLinks(user: User | null) {
    const links = [
      { label: 'Products', route: '/products' },
      { label: 'Cart', route: '/cart' },
    ];

    if (!user) {
      links.push({ label: 'Login', route: '/auth/login' });
      return links;
    }

    if (user.role === 'editor' || user.role === 'admin') {
      links.push({ label: 'Locations', route: '/locations' });
    }

    if (user.role === 'admin') {
      links.push({ label: 'Users', route: '/admin/users' });
    }

    // Add a logout link for logged-in users
    links.push({ label: 'Logout', route: '' });

    return links;
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
