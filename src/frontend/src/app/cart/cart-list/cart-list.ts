import { Component, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { CartService, CartItem } from '../cart.service';
import { ListShellComponent } from '../../shared/list-shell/list-shell.component';
import { APP_SETTINGS } from '../../app-settings';

@Component({
  selector: 'app-cart-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TranslateModule, RouterModule, ListShellComponent],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList {
  readonly cartService = inject(CartService);

  readonly currency = APP_SETTINGS.currency;
  readonly currencyDisplay = APP_SETTINGS.currencyDisplay;
  readonly currencyDigitsInfo = APP_SETTINGS.currencyDigitsInfo;

  readonly items = computed(() =>
    this.cartService.items().map(i => ({ ...i, id: i.productId }))
  );

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
    this.cartService.removeFromCart(productId);
  }
}
