import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../products/product.service';
import { Location } from '../locations/locations-list/location.service';

interface SyncQueueItem {
  id: string;
  type: 'product' | 'location';
  action: 'create' | 'update' | 'delete';
  data: Product | Location;
  timestamp: number;
  synced: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'itemloop-offline';
  private readonly DB_VERSION = 1;
  private readonly STORES = {
    products: 'products',
    locations: 'locations',
    syncQueue: 'syncQueue',
  };
  private http = inject(HttpClient);

  isOnline = signal(navigator.onLine);
  hasPendingSync = signal(false);

  constructor() {
    this.initDB();
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncPendingChanges();
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.checkPendingSync();
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

        if (!db.objectStoreNames.contains(this.STORES.syncQueue)) {
          const syncQueueStore = db.createObjectStore(this.STORES.syncQueue, { keyPath: 'id' });
          syncQueueStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  private async checkPendingSync(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(this.STORES.syncQueue);
    const index = store.index('synced');

    return new Promise((resolve) => {
      let count = 0;
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (!item.synced) {
            count++;
          }
          cursor.continue();
        } else {
          this.hasPendingSync.set(count > 0);
          resolve();
        }
      };

      request.onerror = () => {
        this.hasPendingSync.set(false);
        resolve();
      };
    });
  }

  async saveProduct(product: Product): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.products], 'readwrite');
    const store = transaction.objectStore(this.STORES.products);
    store.put(product);
  }

  async getProducts(): Promise<Product[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.products], 'readonly');
    const store = transaction.objectStore(this.STORES.products);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocation(location: Location): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.locations], 'readwrite');
    const store = transaction.objectStore(this.STORES.locations);
    store.put(location);
  }

  async getLocations(): Promise<Location[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.locations], 'readonly');
    const store = transaction.objectStore(this.STORES.locations);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncQueue);
    store.add(item);
    this.hasPendingSync.set(true);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(this.STORES.syncQueue);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const results: SyncQueueItem[] = [];
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (!item.synced) {
            results.push(item);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async markSyncItemAsSynced(id: string): Promise<void> {
    if (!this.db) await this.initDB();

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
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([this.STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.STORES.syncQueue);
    const index = store.index('synced');

    return new Promise((resolve) => {
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (item.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline()) return;

    const pendingItems = await this.getPendingSyncItems();

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        await this.markSyncItemAsSynced(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
      }
    }

    await this.removeSyncedItems();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'product':
        if (item.action === 'create' || item.action === 'update') {
          await this.http.put(`/api/products/${item.data.id}`, item.data).toPromise();
        } else if (item.action === 'delete') {
          await this.http.delete(`/api/products/${item.data.id}`).toPromise();
        }
        break;
      case 'location':
        if (item.action === 'create' || item.action === 'update') {
          await this.http.put(`/api/locations/${item.data.id}`, item.data).toPromise();
        } else if (item.action === 'delete') {
          await this.http.delete(`/api/locations/${item.data.id}`).toPromise();
        }
        break;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initDB();

    const stores = Object.values(this.STORES);
    const transaction = this.db!.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }

    this.hasPendingSync.set(false);
  }
}
