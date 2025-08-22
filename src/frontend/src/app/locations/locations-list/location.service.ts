import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

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

  // Locations
  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/locations`);
  }

  addLocation(location: Partial<Location>): Observable<Location> {
    return this.http.post<Location>(`${this.apiUrl}/locations`, location);
  }

  updateLocation(id: number, location: Partial<Location>): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/locations/${id}`, location);
  }

  deleteLocation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/locations/${id}`);
  }

  // Buildings
  getBuildings(): Observable<Building[]> {
    return this.http.get<Building[]>(`${this.apiUrl}/buildings`);
  }

  addBuilding(building: Partial<Building>): Observable<Building> {
    return this.http.post<Building>(`${this.apiUrl}/buildings`, building);
  }

  updateBuilding(id: number, building: Partial<Building>): Observable<Building> {
    return this.http.put<Building>(`${this.apiUrl}/buildings/${id}`, building);
  }

  deleteBuilding(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/buildings/${id}`);
  }

  // Zones
  getZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>(`${this.apiUrl}/zones`);
  }

  addZone(zone: Partial<Zone>): Observable<Zone> {
    return this.http.post<Zone>(`${this.apiUrl}/zones`, zone);
  }

  updateZone(id: number, zone: Partial<Zone>): Observable<Zone> {
    return this.http.put<Zone>(`${this.apiUrl}/zones/${id}`, zone);
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/zones/${id}`);
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
    const trimmed = name.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed.padStart(3, '0');
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    let code = '';
    // Special case: first word + padded number if second word is a number
    if (words.length === 2 && /^\d+$/.test(words[1])) {
      code = words[0][0] + words[1].padStart(2, '0');
    } else if (words.length >= 3) {
      code = words.map((w) => w[0]).join('');
    } else if (words.length === 2) {
      code = words[0].slice(0, 2) + words[1][0];
    } else {
      code = words[0].slice(0, 3);
    }
    return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }
}
