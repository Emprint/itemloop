import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { OrderService, Order } from '../order.service';
import { AppSettingsService, AppSettings } from '../../admin/app-settings.service';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, LocaleDatePipe, TranslateModule],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders implements OnInit {
  private orderService = inject(OrderService);
  private appSettingsService = inject(AppSettingsService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly settings = toSignal(this.appSettingsService.getAll(), {
    initialValue: {} as AppSettings,
  });
  readonly currency = computed(() => this.settings()['currency'] || 'EUR');
  readonly currencyDisplay = computed(() => this.settings()['currency_display'] || 'symbol');
  readonly currencyDigitsInfo = computed(() => this.settings()['currency_digits_info'] || '1.2-2');

  ngOnInit() {
    this.orderService.getMyOrders().subscribe({
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

  statusKey(status: Order['status']): string {
    return `ORDERS.STATUS_${status.toUpperCase()}`;
  }
}
