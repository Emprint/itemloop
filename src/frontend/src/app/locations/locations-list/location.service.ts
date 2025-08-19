import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Building {
  id: number;
  name: string;
}

export interface Zone {
  id: number;
  name: string;
  building_id: number;
  building?: Building;
}

export interface Location {
  id: number;
  building_id: number;
  zone_id: number;
  shelf: string;
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
}
