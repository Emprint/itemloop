import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  title: string;
  description?: string;
  condition?: { id: number; name: string };
  condition_id?: number;
  quantity: number;
  estimated_value?: number;
  length?: number;
  width?: number;
  height?: number;
  color?: { id: number; name: string };
  color_id?: number;
  category?: { id: number; name: string };
  category_id?: number;
  visibility: 'private' | 'public';
  location_id: number;
  barcode?: string;
  images?: any[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = '/api/products';

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  addProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
