import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { OfflineStorageService } from '../shared/offline-storage.service';

export type AppSettings = Record<string, string>;

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private apiUrl = '/api/settings';

  getAll(): Observable<AppSettings> {
    if (!navigator.onLine) {
      return from(
        this.offlineStorage.getCachedSettings().then((s) => s ?? ({} as AppSettings)),
      );
    }
    return this.http.get<AppSettings>(this.apiUrl).pipe(
      tap((settings) => this.offlineStorage.saveSettings(settings)),
      catchError(() =>
        from(this.offlineStorage.getCachedSettings().then((s) => s ?? ({} as AppSettings))),
      ),
    );
  }

  update(settings: Partial<AppSettings>): Observable<{ success: boolean; updated: string[] }> {
    return this.http.put<{ success: boolean; updated: string[] }>(this.apiUrl, settings);
  }
}
