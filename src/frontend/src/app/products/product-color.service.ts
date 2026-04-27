import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductColorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}product-colors`;

  getColors(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(this.apiUrl);
  }

  addColor(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(this.apiUrl, { name });
  }
}
