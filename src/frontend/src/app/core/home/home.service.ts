import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Observer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfflineStorageService } from '../../shared/offline-storage.service';

export interface DashboardStats {
  products_count: number;
  items_count: number;
  locations_count: number;
  estimated_value?: number;
  products_by_category?: { name: string; count: number }[];
  users_count?: number;
  reuse_impact: {
    total_kg_recovered: number;
    items_redistributed: number;
    value_redistributed: number;
  };
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);

  async getCachedStats(): Promise<DashboardStats> {
    const products = await this.offlineStorage.getProducts();
    const locations = await this.offlineStorage.getLocations();

    // Calculate products_count
    const products_count = products.length;

    // Calculate items_count (sum of quantities)
    const items_count = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

    // Calculate locations_count
    const locations_count = locations.length;

    // Calculate estimated_value
    const estimated_value = products.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

    // Calculate products_by_category
    const categoryMap = new Map<string, number>();
    for (const p of products) {
      const catName = p.category?.name || 'Uncategorized';
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
    }
    const products_by_category = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      products_count,
      items_count,
      locations_count,
      estimated_value,
      products_by_category,
      reuse_impact: {
        total_kg_recovered: 0,
        items_redistributed: 0,
        value_redistributed: 0,
      },
    };
  }

  getStats(): Observable<DashboardStats> {
    return new Observable<DashboardStats>((observer: Observer<DashboardStats>) => {
      this.getCachedStats().then((cachedStats) => {
        observer.next(cachedStats);

        if (!this.offlineStorage.isOnline()) {
          observer.complete();
          return;
        }

        this.http
          .get<DashboardStats>(`${environment.apiUrl}dashboard`, {
            withCredentials: true,
          })
          .subscribe({
            next: (freshStats: DashboardStats) => {
              observer.next(freshStats);
              observer.complete();
            },
            error: () => observer.complete(),
          });
      });
    });
  }
}
