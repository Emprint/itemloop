
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthResponse } from './auth-response';
import { environment } from '../../environments/environment';

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


  constructor(private http: HttpClient) {}

  loginApi(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/login`, { email, password });
  }

  registerApi(data: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/register`, data);
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
  }

  getUser(): UserState {
    return this._user();
  }

  restoreSession() {
    const token = this.getToken();
    if (!token) return;
    this.http.get<AuthResponse>(`${environment.apiUrl}/me`, {
      headers: this.authHeaders()
    }).subscribe({
      next: (res: AuthResponse) => {
        this.login(res.user.role, res.user.name, token, res.user);
      },
      error: () => {
        this.logout();
      }
    });
  }
}
