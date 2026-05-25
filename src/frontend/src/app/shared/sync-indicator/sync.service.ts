import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineStorageService } from '../offline-storage.service';
import { Product } from '../../products/product.service';
import { Location } from '../../locations/locations-list/location.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private authService = inject(AuthService);

  readonly syncState = signal<SyncState>(navigator.onLine ? 'synced' : 'offline');
  readonly pendingChanges = signal(0);
  readonly lastSync = signal<Date | null>(null);
  readonly syncDetails = signal<{
    products: number;
    locations: number;
    images: number;
    categories: number;
    conditions: number;
    colors: number;
  }>({
    products: 0,
    locations: 0,
    images: 0,
    categories: 0,
    conditions: 0,
    colors: 0,
  });

  // Sync interval in milliseconds (5 minutes)
  private readonly SYNC_INTERVAL = 5 * 60 * 1000;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly label = computed(() => {
    switch (this.syncState()) {
      case 'synced':
        return this.pendingChanges() > 0 ? 'SYNC_PENDING_UPLOAD' : 'SYNC_ALL_SYNCED';
      case 'syncing':
        return 'SYNCING';
      case 'offline':
        return 'SYNC_CHANGES_SAVED_LOCALLY';
      case 'error':
        return 'TAP_TO_RETRY';
    }
  });

  /** True only for authenticated editors and admins. */
  private isOfflineCapable(): boolean {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  }

  constructor() {
    // Keep pendingChanges in sync with the live queue count from OfflineStorageService
    effect(() => {
      this.pendingChanges.set(this.offlineStorage.pendingSyncCount());
    });

    // React to online/offline events — but only sync for editors/admins
    effect(() => {
      const isOnline = this.offlineStorage.isOnline();
      if (!isOnline) {
        this.syncState.set('offline');
        this.stopPeriodicSync();
      } else if (this.isOfflineCapable()) {
        // When coming back online, sync immediately
        this.syncAll();
        this.startPeriodicSync();
      }
    });

    // React to user login: start syncing when editor/admin logs in
    effect(() => {
      const user = this.authService.user();
      if (user && this.isOfflineCapable() && this.offlineStorage.isOnline()) {
        this.syncAll();
        this.startPeriodicSync();
      } else if (!user || !this.isOfflineCapable()) {
        this.stopPeriodicSync();
        // Only reset to synced when actually online; don't override 'offline' state
        if (this.offlineStorage.isOnline()) {
          this.syncState.set('synced');
        }
      }
    });

    // Load IDB counts on startup so the panel shows data even before syncAll runs
    this.refreshIDBCounts();
  }

  private startPeriodicSync() {
    if (this.syncIntervalId) return;
    this.syncIntervalId = setInterval(() => {
      if (this.offlineStorage.isOnline() && this.isOfflineCapable()) {
        this.syncAll();
      }
    }, this.SYNC_INTERVAL);
  }

  private stopPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  async syncAll(): Promise<void> {
    if (!this.offlineStorage.isOnline() || !this.isOfflineCapable()) {
      if (!this.offlineStorage.isOnline()) this.syncState.set('offline');
      return;
    }

    this.syncState.set('syncing');

    try {
      // 1. Push pending offline changes to server FIRST
      await this.offlineStorage.syncPendingChanges();

      // 2. Then pull fresh data from server
      await this.syncReferenceData();
      await this.syncProducts();
      await this.syncLocations();

      this.syncState.set('synced');
      this.lastSync.set(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
      this.syncState.set('error');
    }

    this.updatePendingCount();
  }

  private async syncReferenceData(): Promise<void> {
    try {
      // Fetch and cache categories
      const categories = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-categories`)
        .toPromise();
      if (categories) {
        for (const cat of categories) {
          await this.offlineStorage.saveCategory(cat);
        }
        this.syncDetails.update((d) => ({ ...d, categories: categories.length }));
      }

      // Fetch and cache conditions
      const conditions = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-conditions`)
        .toPromise();
      if (conditions) {
        for (const cond of conditions) {
          await this.offlineStorage.saveCondition(cond);
        }
        this.syncDetails.update((d) => ({ ...d, conditions: conditions.length }));
      }

      // Fetch and cache colors
      const colors = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-colors`)
        .toPromise();
      if (colors) {
        for (const col of colors) {
          await this.offlineStorage.saveColor(col);
        }
        this.syncDetails.update((d) => ({ ...d, colors: colors.length }));
      }
    } catch (err) {
      console.error('Failed to sync reference data:', err);
    }
  }

  private async syncProducts(): Promise<void> {
    try {
      // Fetch all products from API directly (NOT from ProductService which returns from IndexedDB)
      const products = await this.http.get<Product[]>(`${this.apiUrl}products`).toPromise();
      if (products && products.length > 0) {
        // Save all products to IndexedDB (idempotent - overwrites existing)
        for (const product of products) {
          await this.offlineStorage.saveProduct(product);
        }
        this.syncDetails.update((d) => ({ ...d, products: products.length }));

        // Sync thumbnails
        await this.syncProductThumbnails(products);
        const imageCount = products.reduce((acc, p) => acc + (p.images?.length || 0), 0);
        this.syncDetails.update((d) => ({ ...d, images: imageCount }));
      }

      // Update last sync time
      await this.offlineStorage.setLastSync('products', new Date());
    } catch (err) {
      console.error('Failed to sync products:', err);
    }
  }

  private async syncLocations(): Promise<void> {
    try {
      // Fetch all locations from API directly
      const locations = await this.http.get<Location[]>(`${this.apiUrl}locations`).toPromise();
      if (locations && locations.length > 0) {
        // Save all locations to IndexedDB (idempotent - overwrites existing)
        for (const location of locations) {
          await this.offlineStorage.saveLocation(location);
        }
        this.syncDetails.update((d) => ({ ...d, locations: locations.length }));
      }

      // Update last sync time
      await this.offlineStorage.setLastSync('locations', new Date());
    } catch (err) {
      console.error('Failed to sync locations:', err);
    }
  }

  /** Pre-warms the service worker cache for product thumbnails. */
  private async syncProductThumbnails(products: Product[]): Promise<void> {
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        const thumbnail = product.images[0];
        if (thumbnail?.thumbnail_url) {
          // fetch() triggers the SW to cache the URL; ignore errors (offline or 404)
          fetch(thumbnail.thumbnail_url).catch(() => {
            /* intentional: ignore thumbnail prefetch errors */
          });
        }
      }
    }
  }

  private readonly apiUrl = '/api/';

  private async updatePendingCount() {
    const items = await this.offlineStorage.getPendingSyncItems();
    this.pendingChanges.set(items.length);
    await this.refreshIDBCounts();
  }

  /** Reads counts directly from IDB and updates syncDetails — visible even when offline. */
  async refreshIDBCounts(): Promise<void> {
    try {
      const [products, locations, categories, conditions, colors] = await Promise.all([
        this.offlineStorage.getProducts(),
        this.offlineStorage.getLocations(),
        this.offlineStorage.getCategories(),
        this.offlineStorage.getConditions(),
        this.offlineStorage.getColors(),
      ]);
      const images = products.reduce((acc, p) => acc + (p.images?.length || 0), 0);
      this.syncDetails.set({ products: products.length, locations: locations.length, categories: categories.length, conditions: conditions.length, colors: colors.length, images });
    } catch {
      /* ignore — panel will show stale counts rather than crash */
    }
  }

  async retrySync() {
    await this.syncAll();
  }

  // Called when user manually triggers sync
  async manualSync() {
    await this.syncAll();
  }

  checkSyncStatus() {
    if (!this.offlineStorage.isOnline()) {
      this.syncState.set('offline');
      return;
    }

    this.updatePendingCount();

    const hasErrors = this.offlineStorage.syncErrors().length > 0;
    if (hasErrors) {
      this.syncState.set('error');
    } else if (this.pendingChanges() > 0) {
      this.syncState.set('syncing');
    } else {
      this.syncState.set('synced');
    }
  }
}
