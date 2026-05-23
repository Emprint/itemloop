import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, catchError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OfflineStorageService } from '../shared/offline-storage.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth-response';

export interface ProductCategory {
  id: number;
  name: string;
  product_count?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}product-categories`;

  private isOfflineCapable(): boolean {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  }

  getCategories(): Observable<ProductCategory[]> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      return from(this.offlineStorage.getCategories());
    }
    return this.http.get<ProductCategory[]>(this.apiUrl).pipe(
      tap((cats) => {
        if (this.isOfflineCapable()) {
          cats.forEach((c) => this.offlineStorage.saveCategory(c));
        }
      }),
      catchError(() => from(this.offlineStorage.getCategories())),
    );
  }

  addCategory(name: string): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(this.apiUrl, { name });
  }

  updateCategory(id: number, name: string): Observable<ProductCategory> {
    return this.http.put<ProductCategory>(`${this.apiUrl}/${id}`, { name });
  }

  deleteCategory(id: number, reassignTo?: number): Observable<{ success: boolean }> {
    const params = reassignTo ? `?reassign_to=${reassignTo}` : '';
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}${params}`);
  }
}
