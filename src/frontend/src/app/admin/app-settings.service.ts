import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AppSettings = Record<string, string>;

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/settings';

  getAll(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl);
  }

  update(settings: Partial<AppSettings>): Observable<{success: boolean, updated: string[]}> {
    return this.http.put<{success: boolean, updated: string[]}>(this.apiUrl, settings);
  }
}
