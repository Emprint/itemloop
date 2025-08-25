import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductCategory {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {
  private http = inject(HttpClient);
  private apiUrl = '/api/product-categories';

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(this.apiUrl);
  }
}
