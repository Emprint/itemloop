import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../products/product.service';
import { Location } from '../locations/locations-list/location.service';

interface SyncQueueItem {
  id: string;
  type: 'product' | 'location';
  action: 'create' | 'update' | 'delete' | 'upload-image' | 'delete-image';
  data: Product | Location | ImageUploadData | ImageDeleteData;
  timestamp: number;
  synced: boolean;
  syncError?: string;
}

export interface ImageUploadData {
  productId: number;
  files: { name: string; type: string; dataUrl: string }[];
}

export interface ImageDeleteData {
  productId: number;
  imageId: number;
}

interface SyncError {
  itemId: string;
  itemType: string;
  action: string;
  error: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private readonly DB_NAME = 'itemloop-offline';
  private readonly DB_VERSION = 5; // v5: removed redundant 'images' store (SW cache handles thumbnails)
  private readonly STORES = {
    products: 'products',
    locations: 'locations',
    categories: 'categories',
    conditions: 'conditions',
    colors: 'colors',
    syncQueue: 'syncQueue',
    syncErrors: 'syncErrors',
    meta: 'meta',
  };
  private http = inject(HttpClient);

  isOnline = signal(navigator.onLine);
  hasPendingSync = signal(false);
  syncErrors = signal<SyncError[]>([]);

  pendingSyncCount = signal(0);

  /** Prevents concurrent syncPendingChanges() calls from racing each other. */
  private isSyncing = false;

  constructor() {
    this.dbReady = this.initDB();
    this.dbReady.then(() => {
      this.checkPendingSync();
    });

    // Only update the isOnline signal — SyncService handles actually syncing
    window.addEventListener('online', () => {
      this.isOnline.set(true);
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });

    // Periodically reconcile isOnline signal with navigator.onLine
    // (handles Playwright setOffline and other cases where events aren't dispatched)
    setInterval(() => {
      if (this.isOnline() !== navigator.onLine) {
        this.isOnline.set(navigator.onLine);
      }
    }, 3000);
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORES.products)) {
          db.createObjectStore(this.STORES.products, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.STORES.locations)) {
          db.createObjectStore(this.STORES.locations, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.STORES.categories)) {
          db.createObjectStore(this.STORES.categories, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.STORES.conditions)) {
          db.createObjectStore(this.STORES.conditions, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.STORES.colors)) {
          db.createObjectStore(this.STORES.colors, { keyPath: 'id' });
        }

        // v5: drop the 'images' store — service worker handles thumbnail caching
        if (db.objectStoreNames.contains('images')) {
          db.deleteObjectStore('images');
        }

        if (!db.objectStoreNames.contains(this.STORES.meta)) {
          db.createObjectStore(this.STORES.meta, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(this.STORES.syncQueue)) {
          const syncQueueStore = db.createObjectStore(this.STORES.syncQueue, { keyPath: 'id' });
          syncQueueStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.syncErrors)) {
          const syncErrorsStore = db.createObjectStore(this.STORES.syncErrors, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncErrorsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.dbReady;
    }
    return this.db!;
  }

  private async checkPendingSync(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(this.STORES.syncQueue);

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as SyncQueueItem[];
        const count = items.filter((item) => !item.synced).length;
        this.hasPendingSync.set(count > 0);
        this.pendingSyncCount.set(count);
        this.loadSyncErrors();
        resolve();
      };
      request.onerror = () => {
        this.hasPendingSync.set(false);
        this.pendingSyncCount.set(0);
        this.loadSyncErrors();
        resolve();
      };
    });
  }

  private async loadSyncErrors(): Promise<void> {
    const errors = await this.getSyncErrors();
    this.syncErrors.set(errors);
  }

  async saveProduct(product: Product): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.products], 'readwrite');
    const store = transaction.objectStore(this.STORES.products);
    store.put(product);
  }

  async getProducts(): Promise<Product[]> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.products], 'readonly');
    const store = transaction.objectStore(this.STORES.products);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProduct(id: number): Promise<Product | undefined> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.products], 'readonly');
    const store = transaction.objectStore(this.STORES.products);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocation(location: Location): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.locations], 'readwrite');
    const store = transaction.objectStore(this.STORES.locations);
    store.put(location);
  }

  async getLocations(): Promise<Location[]> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.locations], 'readonly');
    const store = transaction.objectStore(this.STORES.locations);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Categories
  async saveCategory(category: { id: number; name: string }): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.categories], 'readwrite');
    const store = transaction.objectStore(this.STORES.categories);
    store.put(category);
  }

  async getCategories(): Promise<{ id: number; name: string }[]> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.categories], 'readonly');
    const store = transaction.objectStore(this.STORES.categories);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Conditions
  async saveCondition(condition: { id: number; name: string }): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.conditions], 'readwrite');
    const store = transaction.objectStore(this.STORES.conditions);
    store.put(condition);
  }

  async getConditions(): Promise<{ id: number; name: string }[]> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.conditions], 'readonly');
    const store = transaction.objectStore(this.STORES.conditions);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Colors
  async saveColor(color: { id: number; name: string }): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.colors], 'readwrite');
    const store = transaction.objectStore(this.STORES.colors);
    store.put(color);
  }

  async getColors(): Promise<{ id: number; name: string }[]> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.colors], 'readonly');
    const store = transaction.objectStore(this.STORES.colors);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // App settings cache (stored in meta store)
  async saveSettings(settings: Record<string, string>): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction([this.STORES.meta], 'readwrite');
    tx.objectStore(this.STORES.meta).put({ key: 'app_settings', value: JSON.stringify(settings) });
  }

  async getCachedSettings(): Promise<Record<string, string> | null> {
    await this.ensureDB();
    const tx = this.db!.transaction([this.STORES.meta], 'readonly');
    const req = tx.objectStore(this.STORES.meta).get('app_settings');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ? JSON.parse(req.result.value) : null);
      req.onerror = () => resolve(null);
    });
  }

  // Meta methods for tracking sync state
  async getLastSync(entityType: string): Promise<Date | null> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.meta], 'readonly');
    const store = transaction.objectStore(this.STORES.meta);
    const request = store.get(entityType);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? new Date(result.value) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setLastSync(entityType: string, date: Date): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.meta], 'readwrite');
    const store = transaction.objectStore(this.STORES.meta);
    store.put({ key: entityType, value: date.toISOString() });
  }

  // Sync all reference data from API
  async syncAllReferenceData(): Promise<void> {
    if (!this.isOnline()) return;

    try {
      // Fetch and cache categories
      const categories = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-categories`)
        .toPromise();
      if (categories) {
        for (const cat of categories) {
          await this.saveCategory(cat);
        }
      }

      // Fetch and cache conditions
      const conditions = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-conditions`)
        .toPromise();
      if (conditions) {
        for (const cond of conditions) {
          await this.saveCondition(cond);
        }
      }

      // Fetch and cache colors
      const colors = await this.http
        .get<{ id: number; name: string }[]>(`${this.apiUrl}product-colors`)
        .toPromise();
      if (colors) {
        for (const col of colors) {
          await this.saveColor(col);
        }
      }
    } catch (err) {
      console.error('Failed to sync reference data:', err);
    }
  }

  private readonly apiUrl = '/api/';

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncQueue);
    store.add(item);
    this.hasPendingSync.set(true);
    this.pendingSyncCount.update((n) => n + 1);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    await this.ensureDB();

    // NOTE: Booleans are not valid IDB keys, so we cannot use the 'synced' index
    // with a cursor. Instead, fetch all items and filter in JS.
    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(this.STORES.syncQueue);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(
          (request.result as SyncQueueItem[])
            .filter((item) => !item.synced)
            .sort((a, b) => a.timestamp - b.timestamp),
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSyncItemAsSynced(id: string): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncQueue);
    const request = store.get(id);

    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.synced = true;
        store.put(item);
      }
    };

    transaction.oncomplete = () => {
      this.checkPendingSync();
    };
  }

  async removeSyncedItems(): Promise<void> {
    await this.ensureDB();

    // NOTE: Booleans are not valid IDB keys - cannot use index cursor.
    // Fetch all items, delete those marked as synced.
    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncQueue);

    return new Promise((resolve) => {
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const items = getAllReq.result as SyncQueueItem[];
        for (const item of items) {
          if (item.synced) {
            store.delete(item.id);
          }
        }
      };
      transaction.oncomplete = () => resolve();
    });
  }

  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline() || this.isSyncing) return;
    this.isSyncing = true;

    try {
      // Refresh CSRF token before pushing offline changes — abort if it fails
      try {
        await this.http.get('/api/csrf-cookie', { withCredentials: true }).toPromise();
      } catch {
        console.warn('CSRF refresh failed; skipping offline sync');
        return;
      }

      const pendingItems = await this.getPendingSyncItems();

      // Maps temp negative IDs → real server IDs assigned after a create sync.
      // Applied to subsequent update/upload-image items before they are processed.
      const idMap = new Map<number, number>();

      for (const item of pendingItems) {
        try {
          this.applyIdMap(item, idMap);
          const mapping = await this.syncItem(item);
          await this.markSyncItemAsSynced(item.id);
          if (mapping) idMap.set(mapping.tempId, mapping.realId);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          const syncError: SyncError = {
            itemId: item.id,
            itemType: item.type,
            action: item.action,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          };
          await this.addSyncError(syncError);
        }
      }

      await this.removeSyncedItems();
    } finally {
      this.isSyncing = false;
    }
  }

  /** Replaces any stale temp IDs in an item's payload with the real server ID. */
  private applyIdMap(item: SyncQueueItem, idMap: Map<number, number>): void {
    if (item.type !== 'product') return;
    if (item.action === 'update' || item.action === 'delete') {
      const p = item.data as Product;
      const realId = idMap.get(p.id);
      if (realId !== undefined) p.id = realId;
    } else if (item.action === 'upload-image' || item.action === 'delete-image') {
      const d = item.data as ImageUploadData | ImageDeleteData;
      const realId = idMap.get(d.productId);
      if (realId !== undefined) d.productId = realId;
    }
  }

  private async syncItem(
    item: SyncQueueItem,
  ): Promise<{ tempId: number; realId: number } | null> {
    switch (item.type) {
      case 'product':
        if (item.action === 'create') {
          const { id: tempId, ...productData } = item.data as Product;
          const created = await this.http.post<Product>('/api/products', productData).toPromise();
          if (created) {
            await this.saveProduct(created);
            await this.deleteProductById(tempId);
            return { tempId, realId: created.id };
          }
        } else if (item.action === 'update') {
          const p = item.data as Product;
          await this.http.put(`/api/products/${p.id}`, p).toPromise();
        } else if (item.action === 'delete') {
          const p = item.data as Product;
          await this.http.delete(`/api/products/${p.id}`).toPromise();
        } else if (item.action === 'upload-image') {
          const uploadData = item.data as ImageUploadData;
          const form = new FormData();
          for (const fileData of uploadData.files) {
            const blob = this.dataUrlToBlob(fileData.dataUrl, fileData.type);
            form.append('images[]', blob, fileData.name);
          }
          const result = await this.http
            .post<{ images: unknown[] }>(`/api/products/${uploadData.productId}/images`, form)
            .toPromise();
          // Refresh product in IDB with real images after upload
          if (result) {
            try {
              const updated = await this.http
                .get<Product>(`/api/products/${uploadData.productId}`)
                .toPromise();
              if (updated) await this.saveProduct(updated);
            } catch {
              // Best effort
            }
          }
        } else if (item.action === 'delete-image') {
          const delData = item.data as ImageDeleteData;
          await this.http
            .delete(`/api/products/${delData.productId}/images/${delData.imageId}`)
            .toPromise();
        }
        break;
      case 'location':
        if (item.action === 'create') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _tempLocId, ...locationData } = item.data as Location;
          await this.http.post('/api/locations', locationData).toPromise();
        } else if (item.action === 'update') {
          const loc = item.data as Location;
          await this.http.put(`/api/locations/${loc.id}`, loc).toPromise();
        } else if (item.action === 'delete') {
          const loc = item.data as Location;
          await this.http.delete(`/api/locations/${loc.id}`).toPromise();
        }
        break;
    }
    return null;
  }

  private async deleteProductById(id: number): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORES.products], 'readwrite');
      const store = transaction.objectStore(this.STORES.products);
      store.delete(id);
      transaction.oncomplete = () => resolve();
    });
  }

  private dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  async clearAllData(): Promise<void> {
    await this.ensureDB();

    const stores = Object.values(this.STORES);
    const transaction = this.db!.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }

    this.hasPendingSync.set(false);
    this.syncErrors.set([]);
  }

  async addSyncError(error: SyncError): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.syncErrors], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncErrors);
    store.add(error);

    const errors = await this.getSyncErrors();
    this.syncErrors.set(errors);
  }

  async getSyncErrors(): Promise<SyncError[]> {
    await this.ensureDB();

    if (!this.db) return [];

    const transaction = this.db.transaction([this.STORES.syncErrors], 'readonly');
    const store = transaction.objectStore(this.STORES.syncErrors);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    return new Promise((resolve, reject) => {
      const results: SyncError[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncErrors(): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.syncErrors], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncErrors);
    store.clear();
    this.syncErrors.set([]);
  }

  async removeSyncError(id: number): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction([this.STORES.syncErrors], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncErrors);
    store.delete(id);

    const errors = await this.getSyncErrors();
    this.syncErrors.set(errors);
  }
}
