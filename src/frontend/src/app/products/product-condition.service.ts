import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProductConditionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getConditions(): Observable<string[]> {
    return this.http
      .get<{ id: number; name: string }[]>(`${this.apiUrl}/product-conditions`)
      .pipe(map((list) => list.map((item) => item.name)));
  }

  addCondition(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${this.apiUrl}/product-conditions`, {
      name,
    });
  }
}
