import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthResponse, User } from './auth-response';
import { environment } from '../../environments/environment';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface RegisterPendingResponse {
  registered: boolean;
  pending: true;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  readonly user = this._user;

  register(name: string, email: string, password: string): Observable<boolean> {
    return this.registerApi({ name, email, password }).pipe(
      tap((res) => {
        if ('pending' in res) {
          return;
        }
        this.setUser(res as AuthResponse);
      }),
      map((res) => !('pending' in res)),
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
      catchError(() => of(null)), // Handle offline: still log out locally
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
    // Clear cookies related to authentication and CSRF
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
    document.cookie = 'PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
  }

  restoreSession() {
    // Immediately restore from localStorage — enables offline-first for editors/admins
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        this._user.set(JSON.parse(cached));
      } catch {
        /* ignore invalid JSON */
      }
    }

    // Don't try to verify session with API if offline
    if (!navigator.onLine) return;

    // Verify session with server when online
    return this.http.get<AuthResponse>(`${environment.apiUrl}me`).subscribe({
      next: (res: AuthResponse) => {
        this.setUser(res); // Update with fresh server data
      },
      error: (err) => {
        // Only clear session on explicit auth rejection (401/403)
        // For 504, ERR_FAILED, or other network errors: keep cached user (stay logged in offline)
        if (err.status === 401 || err.status === 403) {
          this.softLogout();
        }
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
        return this.http.post<AuthResponse | RegisterPendingResponse>(
          `${environment.apiUrl}auth/register`,
          data,
        );
      }),
    );
  }

  private getCsrfCookie(): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}csrf-cookie`);
  }

  private logoutApi() {
    return this.http.post(`${environment.apiUrl}auth/logout`, {});
  }

  private setUser(res: AuthResponse) {
    this._user.set(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
  }
}
