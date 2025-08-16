import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthResponse, User } from './auth-response';
import { environment } from '../../environments/environment';
import { map, Observable, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  readonly user = this._user;

  register(name: string, email: string, password: string) {
    return this.registerApi({ name, email, password }).pipe(
      tap((res) => {
        this.setUser(res);
      }),
      map(() => void 0),
    );
  }

  login(email: string, password: string) {
    return this.loginApi(email, password).pipe(
      tap((res) => {
        this.setUser(res);
      }),
      map(() => void 0),
    );
  }

  logout() {
    return this.logoutApi().pipe(
      tap(() => {
        this.softLogout();
        this.router.navigate(['/']);
      }),
      map(() => void 0),
    );
  }

  softLogout() {
    this._user.set(null);
    localStorage.removeItem('user');
  }

  restoreSession() {
    const token = this.getCsrfCookie();
    if (!token) return;
    // First, get CSRF cookie
    return this.http.get<AuthResponse>(`${environment.apiUrl}me`).subscribe({
      next: (res: AuthResponse) => {
        this.setUser(res);
      },
      error: () => {
        this.logout();
      },
    });
  }

  private loginApi(email: string, password: string) {
    return this.getCsrfCookie().pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${environment.apiUrl}auth/login`, { email, password });
      }),
    );
  }

  private registerApi(data: { name: string; email: string; password: string }) {
    return this.getCsrfCookie().pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${environment.apiUrl}auth/register`, data);
      }),
    );
  }

  private getCsrfCookie(): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}csrf-cookie`);
  }

  private logoutApi() {
    return this.http.get(`${environment.apiUrl}auth/logout`);
  }

  private setUser(res: AuthResponse) {
    this._user.set(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
  }
}
