import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrderService, Order } from '../order.service';
import { AppSettingsService, AppSettings } from '../../admin/app-settings.service';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, LocaleDatePipe, TranslateModule, ConfirmModal],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList implements OnInit {
  private orderService = inject(OrderService);
  private translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expandedId = signal<number | null>(null);

  pendingOrder: Order | null = null;
  pendingStatus: Order['status'] | null = null;
  showStatusModal = signal(false);

  readonly settings = toSignal(this.appSettingsService.getAll(), {
    initialValue: {} as AppSettings,
  });
  readonly currency = computed(() => this.settings()['currency'] || 'EUR');
  readonly currencyDisplay = computed(() => this.settings()['currency_display'] || 'symbol');
  readonly currencyDigitsInfo = computed(() => this.settings()['currency_digits_info'] || '1.2-2');

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('ORDERS.ERROR_LOADING');
        this.loading.set(false);
      },
    });
  }

  toggleExpand(id: number) {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  isExpanded(id: number) {
    return this.expandedId() === id;
  }

  setStatus(order: Order, status: Order['status']) {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: (updated) => {
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      },
      error: () => {
        this.error.set('ORDERS.ERROR_UPDATING');
      },
    });
  }

  requestSetStatus(order: Order, status: Order['status']) {
    this.pendingOrder = order;
    this.pendingStatus = status;
    this.showStatusModal.set(true);
  }

  confirmSetStatus() {
    if (this.pendingOrder && this.pendingStatus) {
      this.setStatus(this.pendingOrder, this.pendingStatus);
    }
    this.pendingOrder = null;
    this.pendingStatus = null;
    this.showStatusModal.set(false);
  }

  cancelSetStatus() {
    this.pendingOrder = null;
    this.pendingStatus = null;
    this.showStatusModal.set(false);
  }

  confirmStatusMessage(): string {
    if (!this.pendingStatus) return '';
    const map: Record<Order['status'], string> = {
      completed: 'ORDERS.CONFIRM_COMPLETE',
      cancelled: 'ORDERS.CONFIRM_CANCEL',
      pending: 'ORDERS.CONFIRM_REOPEN',
    };
    return this.translate.instant(map[this.pendingStatus] ?? '');
  }

  statusKey(status: Order['status']): string {
    return `ORDERS.STATUS_${status.toUpperCase()}`;
  }
}
