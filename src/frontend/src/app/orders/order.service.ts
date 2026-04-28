import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface OrderItem {
  id: number;
  product_id: number;
  product_title: string;
  quantity: number;
  unit_price: number | null;
}

export interface Order {
  id: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string; email: string };
  items: OrderItem[];
  total: number | null;
}

export interface PlaceOrderPayload {
  items: { product_id: number; quantity: number }[];
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  placeOrder(payload: PlaceOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.base}orders`, payload);
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}orders/mine`);
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}orders`);
  }

  updateStatus(orderId: number, status: Order['status']): Observable<Order> {
    return this.http.patch<Order>(`${this.base}orders/${orderId}/status`, { status });
  }
}
