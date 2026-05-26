import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, of, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  OfflineStorageService,
  ImageUploadData,
  ImageDeleteData,
} from '../shared/offline-storage.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth-response';

export interface Image {
  id: number;
  url: string;
  thumbnail_url?: string;
  path?: string;
  format?: string;
  width?: number;
  height?: number;
  sort_order?: number;
}

export interface ProductHistoryMeta {
  order_id?: number;
  reason?: string;
  old_code?: string;
  new_code?: string;
  old_label?: string;
  new_label?: string;
}

export interface ProductHistoryEntry {
  id: number;
  event_type: string;
  delta: number | null;
  user_name: string | null;
  meta: ProductHistoryMeta | null;
  created_at: string;
}

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
  weight?: number;
  destination?: string;
  color?: { id: number; name: string };
  color_id?: number;
  category?: { id: number; name: string };
  category_id?: number;
  visibility: 'private' | 'public';
  location_id: number;
  location?: {
    id: number;
    shelf?: string;
    code?: string;
    zone?: { id: number; name: string };
    building?: { id: number; name: string };
  };
  barcode?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
  images?: Image[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}products`;

  /** True only for authenticated editors and admins — they get offline-first behaviour. */
  private isOfflineCapable(): boolean {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  }

  getProducts(): Observable<Product[]> {
    if (!this.isOfflineCapable()) {
      // Customers and visitors: always fetch from API, no IndexedDB
      return this.http.get<Product[]>(this.apiUrl);
    }

    if (!this.offlineStorage.isOnline()) {
      // Offline editor/admin: serve from IndexedDB
      return from(this.offlineStorage.getProducts());
    }

    // Online editor/admin: fetch from API, cache, and fall back to IndexedDB on error
    return this.http.get<Product[]>(this.apiUrl).pipe(
      tap((products) => products.forEach((p) => this.offlineStorage.saveProduct(p))),
      catchError(() => from(this.offlineStorage.getProducts())),
    );
  }

  addProduct(product: Partial<Product>): Observable<Product> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Use a negative temp ID to avoid collision with real IDs in IndexedDB
      const tempId = `temp-${Date.now()}`;
      const tempNumId = -Date.now();
      const fullProduct = { ...product, id: tempNumId } as Product;
      this.offlineStorage.addToSyncQueue({
        id: tempId,
        type: 'product',
        action: 'create',
        data: fullProduct,
        timestamp: Date.now(),
        synced: false,
      });
      // Enrich with full location object from IDB for display purposes
      return from(
        this.offlineStorage.getLocations().then((locs) => {
          const loc = locs.find((l) => l.id === fullProduct.location_id);
          if (loc) fullProduct.location = loc;
          this.offlineStorage.saveProduct(fullProduct);
          return fullProduct;
        }),
      );
    }

    // Create via API when online
    return this.http
      .post<Product>(this.apiUrl, product)
      .pipe(tap((createdProduct) => this.offlineStorage.saveProduct(createdProduct)));
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Merge form data with existing cached product to preserve nested objects
      return from(this.offlineStorage.getProduct(id)).pipe(
        switchMap((cachedProduct) => {
          const fullProduct = { ...(cachedProduct || {}), ...product, id } as Product;
          this.offlineStorage.addToSyncQueue({
            id: `update-${id}-${Date.now()}`,
            type: 'product',
            action: 'update',
            data: fullProduct,
            timestamp: Date.now(),
            synced: false,
          });
          this.offlineStorage.saveProduct(fullProduct);
          return of(fullProduct);
        }),
      );
    }

    // Update via API when online
    return this.http
      .put<Product>(`${this.apiUrl}/${id}`, product)
      .pipe(tap((updatedProduct) => this.offlineStorage.saveProduct(updatedProduct)));
  }

  deleteProduct(id: number): Observable<void> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Queue for sync when offline
      this.offlineStorage.addToSyncQueue({
        id: `delete-${id}-${Date.now()}`,
        type: 'product',
        action: 'delete',
        data: { id } as Product,
        timestamp: Date.now(),
        synced: false,
      });
      // Return observable
      return of(void 0);
    }

    // Delete via API when online
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImages(productId: number, files: File[]): Observable<{ images: Image[] }> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Read files as dataURLs and queue for sync
      const readAll = Promise.all(
        files.map(
          (f) =>
            new Promise<{ name: string; type: string; dataUrl: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({ name: f.name, type: f.type, dataUrl: reader.result as string });
              reader.readAsDataURL(f);
            }),
        ),
      );
      return from(
        readAll.then(async (fileData) => {
          await this.offlineStorage.addToSyncQueue({
            id: `upload-image-${productId}-${Date.now()}`,
            type: 'product',
            action: 'upload-image',
            data: { productId, files: fileData } as ImageUploadData,
            timestamp: Date.now(),
            synced: false,
          });
          // Create temp Image objects with object URLs for display
          const tempImages: Image[] = fileData.map((fd, i) => ({
            id: -(Date.now() + i),
            url: fd.dataUrl,
            thumbnail_url: fd.dataUrl,
          }));
          return { images: tempImages };
        }),
      );
    }
    const form = new FormData();
    files.forEach((f) => form.append('images[]', f));
    return this.http.post<{ images: Image[] }>(`${this.apiUrl}/${productId}/images`, form);
  }

  deleteImage(productId: number, imageId: number): Observable<void> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline() && imageId > 0) {
      return from(
        this.offlineStorage
          .addToSyncQueue({
            id: `delete-image-${productId}-${imageId}-${Date.now()}`,
            type: 'product',
            action: 'delete-image',
            data: { productId, imageId } as ImageDeleteData,
            timestamp: Date.now(),
            synced: false,
          })
          .then(() => undefined as void),
      );
    }
    return this.http.delete<void>(`${this.apiUrl}/${productId}/images/${imageId}`);
  }

  reorderImages(productId: number, ids: number[]): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/${productId}/images/reorder`, {
      ids,
    });
  }

  getHistory(productId: number): Observable<ProductHistoryEntry[]> {
    return this.http.get<ProductHistoryEntry[]>(`${this.apiUrl}/${productId}/history`);
  }

  createStockMovement(productId: number, delta: number, reason?: string): Observable<Product> {
    return this.http
      .post<Product>(`${this.apiUrl}/${productId}/stock-movement`, { delta, reason })
      .pipe(tap((updated) => this.offlineStorage.saveProduct(updated)));
  }
}
