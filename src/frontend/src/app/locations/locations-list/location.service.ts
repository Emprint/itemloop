import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, from, of, catchError, switchMap } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OfflineStorageService } from '../../shared/offline-storage.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';

export interface Building {
  id: number;
  name: string;
  code: string;
}

export interface Zone {
  id: number;
  name: string;
  building_id: number;
  code: string;
  building?: Building;
}

export interface Location {
  id: number;
  building_id: number;
  zone_id: number;
  shelf: string;
  code: string;
  building?: Building;
  zone?: Zone;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private authService = inject(AuthService);

  /** True only for authenticated editors and admins — they get offline-first behaviour. */
  private isOfflineCapable(): boolean {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  }

  // Locations
  getLocations(): Observable<Location[]> {
    if (!this.isOfflineCapable()) {
      // Customers and visitors: always fetch from API, no IndexedDB
      return this.http.get<Location[]>(`${this.apiUrl}locations`);
    }

    if (!this.offlineStorage.isOnline()) {
      // Offline editor/admin: serve from IndexedDB
      return from(this.offlineStorage.getLocations());
    }

    // Online editor/admin: fetch from API and cache in IndexedDB for offline use
    return this.http
      .get<Location[]>(`${this.apiUrl}locations`)
      .pipe(tap((locations) => locations.forEach((l) => this.offlineStorage.saveLocation(l))));
  }

  addLocation(location: Partial<Location>): Observable<Location> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      const tempId = `temp-location-${Date.now()}`;
      const tempNumId = -Date.now();
      const partialLocation = { ...location, id: tempNumId } as Location;
      this.offlineStorage.addToSyncQueue({
        id: tempId,
        type: 'location',
        action: 'create',
        data: partialLocation,
        timestamp: Date.now(),
        synced: false,
      });
      // Enrich with zone/building objects for display
      return from(
        this.offlineStorage.getLocations().then((locs) => {
          // We need zones/buildings - get them from existing cached locations
          const zoneRef = locs.find((l) => l.zone_id === partialLocation.zone_id)?.zone;
          if (zoneRef) partialLocation.zone = zoneRef;
          const buildingRef = partialLocation.zone?.building;
          if (buildingRef) partialLocation.building = buildingRef;
          this.offlineStorage.saveLocation(partialLocation);
          return partialLocation;
        }),
      );
    }

    // Create via API when online
    const httpObs = this.http.post<Location>(`${this.apiUrl}locations`, location);
    httpObs.subscribe({
      next: (createdLocation) => {
        // Cache the created location
        this.offlineStorage.saveLocation(createdLocation);
      },
      error: (err) => {
        console.error('Failed to add location:', err);
      },
    });
    return httpObs;
  }

  updateLocation(id: number, location: Partial<Location>): Observable<Location> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Merge with cached location to preserve building/zone nested objects
      return from(this.offlineStorage.getLocations()).pipe(
        switchMap((locs) => {
          const cached = locs.find((l) => l.id === id);
          const fullLocation = { ...(cached || {}), ...location, id } as Location;
          this.offlineStorage.addToSyncQueue({
            id: `update-location-${id}-${Date.now()}`,
            type: 'location',
            action: 'update',
            data: fullLocation,
            timestamp: Date.now(),
            synced: false,
          });
          this.offlineStorage.saveLocation(fullLocation);
          return of(fullLocation);
        }),
      );
    }

    // Update via API when online
    const httpObs = this.http.put<Location>(`${this.apiUrl}locations/${id}`, location);
    httpObs.subscribe({
      next: (updatedLocation) => {
        // Update local cache
        this.offlineStorage.saveLocation(updatedLocation);
      },
      error: (err) => {
        console.error('Failed to update location:', err);
      },
    });
    return httpObs;
  }

  deleteLocation(id: number): Observable<void> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Queue for sync when offline
      this.offlineStorage.addToSyncQueue({
        id: `delete-${id}-${Date.now()}`,
        type: 'location',
        action: 'delete',
        data: { id } as Location,
        timestamp: Date.now(),
        synced: false,
      });
      // Return observable
      return of(void 0);
    }

    // Delete via API when online
    const httpObs = this.http.delete<void>(`${this.apiUrl}locations/${id}`);
    httpObs.subscribe({
      next: () => {
        // Note: We can't easily delete from IndexedDB without the full location
        // In a real implementation, we'd need to track deletions separately
      },
      error: (err) => {
        console.error('Failed to delete location:', err);
      },
    });
    return httpObs;
  }

  // Buildings
  getBuildings(): Observable<Building[]> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Derive buildings from cached locations
      return from(this.offlineStorage.getLocations()).pipe(
        map((locs) => {
          const seen = new Set<number>();
          const buildings: Building[] = [];
          locs.forEach((l) => {
            if (l.building && !seen.has(l.building_id)) {
              seen.add(l.building_id);
              buildings.push(l.building);
            }
          });
          return buildings;
        }),
      );
    }
    return this.http.get<Building[]>(`${this.apiUrl}buildings`).pipe(
      catchError(() =>
        from(this.offlineStorage.getLocations()).pipe(
          map((locs) => {
            const seen = new Set<number>();
            const buildings: Building[] = [];
            locs.forEach((l) => {
              if (l.building && !seen.has(l.building_id)) {
                seen.add(l.building_id);
                buildings.push(l.building);
              }
            });
            return buildings;
          }),
        ),
      ),
    );
  }

  addBuilding(building: Partial<Building>): Observable<Building> {
    return this.http.post<Building>(`${this.apiUrl}buildings`, building);
  }

  updateBuilding(id: number, building: Partial<Building>): Observable<Building> {
    return this.http.put<Building>(`${this.apiUrl}buildings/${id}`, building);
  }

  deleteBuilding(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}buildings/${id}`);
  }

  // Zones
  getZones(): Observable<Zone[]> {
    if (this.isOfflineCapable() && !this.offlineStorage.isOnline()) {
      // Derive zones from cached locations
      return from(this.offlineStorage.getLocations()).pipe(
        map((locs) => {
          const seen = new Set<number>();
          const zones: Zone[] = [];
          locs.forEach((l) => {
            if (l.zone && !seen.has(l.zone_id)) {
              seen.add(l.zone_id);
              zones.push(l.zone);
            }
          });
          return zones;
        }),
      );
    }
    return this.http.get<Zone[]>(`${this.apiUrl}zones`).pipe(
      catchError(() =>
        from(this.offlineStorage.getLocations()).pipe(
          map((locs) => {
            const seen = new Set<number>();
            const zones: Zone[] = [];
            locs.forEach((l) => {
              if (l.zone && !seen.has(l.zone_id)) {
                seen.add(l.zone_id);
                zones.push(l.zone);
              }
            });
            return zones;
          }),
        ),
      ),
    );
  }

  addZone(zone: Partial<Zone>): Observable<Zone> {
    return this.http.post<Zone>(`${this.apiUrl}zones`, zone);
  }

  updateZone(id: number, zone: Partial<Zone>): Observable<Zone> {
    return this.http.put<Zone>(`${this.apiUrl}zones/${id}`, zone);
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}zones/${id}`);
  }

  /**
   * Generate a 3-character code from a name according to rules:
   * - 3+ words: first letter of each word
   * - 2 words: first 2 letters of first word + first letter of second
   * - 1 word: first 3 letters
   * - Only digits: pad to 3 digits with leading zeros
   * Always uppercase, remove non-alphanumeric
   */
  static generateCode(name: string): string {
    if (!name) return '';
    // Normalize accents
    const normalized = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const trimmed = normalized.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed.padStart(3, '0');
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    let code = '';
    // Special case: first word + padded number if second word is a number
    if (words.length === 2 && /^\d+$/.test(words[1])) {
      code = words[0][0] + words[1].padStart(2, '0');
    } else if (words.length >= 3) {
      code = words
        .slice(0, 3)
        .map((w) => w[0])
        .join('');
    } else if (words.length === 2) {
      code = words[0].slice(0, 2) + words[1][0];
    } else {
      code = words[0].slice(0, 3);
    }
    code = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Always return exactly 3 chars: pad with last char if too short, slice if too long
    if (code.length < 3) code = code.padEnd(3, code[code.length - 1] || 'X');
    return code.slice(0, 3);
  }
}
