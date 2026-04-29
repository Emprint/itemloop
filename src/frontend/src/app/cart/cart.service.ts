import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../products/product.service';

export interface CartItem {
  productId: number;
  title: string;
  quantity: number;
  maxQuantity: number;
  price?: number;
}

const STORAGE_KEY = 'itemloop_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>(this._load());

  readonly items = this._items.asReadonly();
  readonly totalCount = computed(() => this._items().reduce((s, i) => s + i.quantity, 0));
  readonly grandTotal = computed(() =>
    this._items().reduce((s, i) => s + (i.price != null ? i.price * i.quantity : 0), 0),
  );
  readonly hasPrice = computed(() => this._items().some((i) => i.price != null));

  private _load(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private _save(items: CartItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  addToCart(product: Product, qty: number): void {
    const max = product.quantity;
    const safeQty = Math.min(Math.max(1, qty), max);
    this._items.update((items) => {
      const existing = items.find((i) => i.productId === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = items.map((i) =>
          i.productId === product.id ? { ...i, quantity: Math.min(i.quantity + safeQty, max) } : i,
        );
      } else {
        updated = [
          ...items,
          {
            productId: product.id,
            title: product.title,
            quantity: safeQty,
            maxQuantity: max,
            price: product.estimated_value,
          },
        ];
      }
      this._save(updated);
      return updated;
    });
  }

  updateQuantity(productId: number, qty: number): void {
    this._items.update((items) => {
      const updated = items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(Math.max(1, qty), i.maxQuantity) }
          : i,
      );
      this._save(updated);
      return updated;
    });
  }

  removeFromCart(productId: number): void {
    this._items.update((items) => {
      const updated = items.filter((i) => i.productId !== productId);
      this._save(updated);
      return updated;
    });
  }

  getQuantityFor(productId: number): number {
    return this._items().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  clear(): void {
    this._items.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
