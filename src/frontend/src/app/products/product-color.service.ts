import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProductColorService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getColors(): Observable<string[]> {
    return this.http
      .get<{ id: number; name: string }[]>(`${this.apiUrl}/product-colors`)
      .pipe(map((list) => list.map((item) => item.name)));
  }

  addColor(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${this.apiUrl}/product-colors`, { name });
  }
}
