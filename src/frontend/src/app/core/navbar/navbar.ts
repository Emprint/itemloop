
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, UserRole, UserState } from '../../auth/auth.service';


@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule],
  // No import needed for *for directive in Angular v17+
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  readonly user: () => UserState;
  readonly links: () => Array<{ label: string; route: string }>;

  constructor(private auth: AuthService) {
    this.user = this.auth.user;
    this.links = computed(() => {
      const user = this.user();

      const links = [
        { label: 'Products', route: '/products' },
        { label: 'Cart', route: '/cart' }
      ];

      if (!user.isLoggedIn) {
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
    });
  }

  logout() {
    this.auth.logout();
  }
}
