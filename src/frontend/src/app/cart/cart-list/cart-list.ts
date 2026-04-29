import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterModule } from '@angular/router';
import { CartService, CartItem } from '../cart.service';
import { ListShellComponent } from '../../shared/list-shell/list-shell.component';
import { APP_SETTINGS } from '../../app-settings';
import { OrderService } from '../../orders/order.service';
import { AuthService } from '../../auth/auth.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';

@Component({
  selector: 'app-cart-list',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    TranslateModule,
    RouterModule,
    ListShellComponent,
    ConfirmModal,
  ],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList {
  readonly cartService = inject(CartService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly currency = APP_SETTINGS.currency;
  readonly currencyDisplay = APP_SETTINGS.currencyDisplay;
  readonly currencyDigitsInfo = APP_SETTINGS.currencyDigitsInfo;

  readonly items = computed(() => this.cartService.items().map((i) => ({ ...i, id: i.productId })));

  readonly isLoggedIn = computed(() => !!this.authService.user());
  readonly placing = false;

  showRemoveModal = signal(false);
  productIdToRemove: number | null = null;
  showClearModal = signal(false);

  decrement(item: CartItem) {
    if (item.quantity <= 1) return;
    this.cartService.updateQuantity(item.productId, item.quantity - 1);
  }

  increment(item: CartItem) {
    this.cartService.updateQuantity(item.productId, item.quantity + 1);
  }

  setQty(item: CartItem, value: number) {
    this.cartService.updateQuantity(item.productId, value);
  }

  remove(productId: number) {
    this.productIdToRemove = productId;
    this.showRemoveModal.set(true);
  }

  confirmRemove() {
    if (this.productIdToRemove !== null) {
      this.cartService.removeFromCart(this.productIdToRemove);
    }
    this.productIdToRemove = null;
    this.showRemoveModal.set(false);
  }

  cancelRemove() {
    this.productIdToRemove = null;
    this.showRemoveModal.set(false);
  }

  requestClear() {
    this.showClearModal.set(true);
  }

  confirmClear() {
    this.cartService.clear();
    this.showClearModal.set(false);
  }

  cancelClear() {
    this.showClearModal.set(false);
  }

  placeOrder() {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const payload = {
      items: this.cartService.items().map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      })),
    };
    this.orderService.placeOrder(payload).subscribe({
      next: () => {
        this.cartService.clear();
        this.router.navigate(['/orders/my']);
      },
      error: () => {
        // surface error — kept minimal for now
        alert('Failed to place order. Please try again.');
      },
    });
  }
}
