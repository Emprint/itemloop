import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, catchError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OfflineStorageService } from '../shared/offline-storage.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth-response';

@Injectable({ providedIn: 'root' })
export class ProductConditionService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}product-conditions`;

  private isOfflineCapable(): boolean {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  }

  getConditions(): Observable<{ id: number; name: string }[]> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      return from(this.offlineStorage.getConditions());
    }
    return this.http.get<{ id: number; name: string }[]>(this.apiUrl).pipe(
      tap((conditions) => {
        if (this.isOfflineCapable()) {
          conditions.forEach((c) => this.offlineStorage.saveCondition(c));
        }
      }),
      catchError(() => from(this.offlineStorage.getConditions())),
    );
  }

  addCondition(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(this.apiUrl, { name });
  }
}
