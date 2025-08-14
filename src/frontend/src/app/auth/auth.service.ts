import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthResponse } from './auth-response';
import { environment } from '../../environments/environment';
import { switchMap } from 'rxjs';
import { Router } from '@angular/router';

export type UserRole = 'customer' | 'editor' | 'admin' | null;
export interface UserState {
  isLoggedIn: boolean;
  role: UserRole;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<UserState>({ isLoggedIn: false, role: null });
  readonly user = this._user;

  constructor(private http: HttpClient, private router: Router) {}

  loginApi(email: string, password: string) {
    // First, get CSRF cookie
    return this.http.get(`${environment.backendUrl}sanctum/csrf-cookie`).pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${environment.backendUrl}login`, { email, password });
      })
    );
  }

  registerApi(data: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>(`${environment.backendUrl}api/register`, data);
  }

  setSession(token: string, user: any) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getStoredUser(): UserState {
    const user = localStorage.getItem('user');
    if (user) {
      const u = JSON.parse(user);
      return { isLoggedIn: true, role: u.role, name: u.name };
    }
    return { isLoggedIn: false, role: null };
  }

  authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  login(role: UserRole, name?: string, token?: string, user?: any) {
    this._user.set({ isLoggedIn: true, role, name });
    if (token && user) {
      this.setSession(token, user);
    }
  }

  logout() {
    this._user.set({ isLoggedIn: false, role: null });
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  getUser(): UserState {
    return this._user();
  }

  restoreSession() {
    const token = this.getToken();
    if (!token) return;
    // First, get CSRF cookie
    return this.http.get(`${environment.backendUrl}sanctum/csrf-cookie`).pipe(
      switchMap(() => {
        return this.http.get<AuthResponse>(`${environment.backendUrl}api/me`);
      })
    ).subscribe({
      next: (res: AuthResponse) => {
        this.login(res.user.role, res.user.name, token, res.user);
      },
      error: () => {
        this.logout();
      }
    });
  }

  // Utility to get cookie value by name
  getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
}
