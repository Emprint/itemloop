import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ProductService, ProductHistoryEntry } from '../../product.service';
import { LocaleDatePipe } from '../../../shared/locale-date.pipe';

@Component({
  selector: 'app-product-history',
  standalone: true,
  imports: [CommonModule, TranslateModule, LocaleDatePipe],
  templateUrl: './product-history.component.html',
  styleUrl: './product-history.component.css',
})
export class ProductHistoryComponent implements OnChanges {
  @Input({ required: true }) productId!: number;
  @Input() refreshTrigger = 0;

  private productService = inject(ProductService);

  entries = signal<ProductHistoryEntry[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['productId'] || changes['refreshTrigger']) {
      this.load();
    }
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.productService.getHistory(this.productId).subscribe({
      next: (data) => {
        this.entries.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Returns the i18n key for an event type. */
  eventKey(type: string): string {
    const map: Record<string, string> = {
      initial_stock: 'HISTORY.INITIAL_STOCK',
      stock_adjustment: 'HISTORY.STOCK_ADJUSTMENT',
      order_placed: 'HISTORY.ORDER_PLACED',
      order_cancelled: 'HISTORY.ORDER_CANCELLED',
      order_reopened: 'HISTORY.ORDER_REOPENED',
      order_completed: 'HISTORY.ORDER_COMPLETED',
      location_move: 'HISTORY.LOCATION_MOVE',
      field_update: 'HISTORY.FIELD_UPDATE',
    };
    return map[type] ?? type;
  }

  /** Returns the delta display string with sign, e.g. "+3" or "−2". */
  deltaLabel(delta: number | null): string {
    if (delta === null || delta === undefined) return '';
    return delta >= 0 ? `+${delta}` : `${delta}`;
  }

  /** True for quantity-affecting events (delta is non-null). */
  isQuantityEvent(entry: ProductHistoryEntry): boolean {
    return entry.delta !== null && entry.delta !== undefined;
  }
}
