import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  products_count: number;
  items_count: number;
  locations_count: number;
  estimated_value?: number;
  products_by_category?: { name: string; count: number }[];
  users_count?: number;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private http = inject(HttpClient);

  getStats() {
    return this.http.get<DashboardStats>(`${environment.apiUrl}dashboard`, {
      withCredentials: true,
    });
  }
}
