import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { OrderService, Order } from '../order.service';
import { APP_SETTINGS } from '../../app-settings';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, LocaleDatePipe, TranslateModule],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders implements OnInit {
  private orderService = inject(OrderService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly currency = APP_SETTINGS.currency;
  readonly currencyDisplay = APP_SETTINGS.currencyDisplay;
  readonly currencyDigitsInfo = APP_SETTINGS.currencyDigitsInfo;

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
