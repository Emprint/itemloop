import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { LocationService, Location, Building, Zone } from './location.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, TranslateModule],
  templateUrl: './locations-list.html',
  styleUrl: './locations-list.scss',
})
export class LocationsList {
  showDeleteModal = false;
  locationToDelete: Location | null = null;
  locations = signal<Location[]>([]);
  buildings = signal<Building[]>([]);
  zones = signal<Zone[]>([]);
  errorMessage = signal<string | null>(null);
  showForm = signal(false);
  selectedLocation: Location | null = null;
  private service = inject(LocationService);
  private fb = inject(FormBuilder);
  form = this.fb.group({
    shelf: ['', []],
    zone_id: [null as number | null, []],
    code: ['', []],
  });
  finalCode = '';

  getFormLocation(): Partial<Location> {
    // Normalize form values for getFinalCode
    const value = this.form.value;
    return {
      shelf: value.shelf ?? '',
      zone_id: value.zone_id ?? undefined,
      code: value.code ?? '',
    };
  }

  constructor() {
    this.loadLocations();
    this.loadBuildings();
    this.loadZones();
  }

  loadBuildings() {
    this.service.getBuildings().subscribe({
      next: (buildings) => {
        this.buildings.set(buildings);
      },
      error: () => {
        this.errorMessage.set('Failed to load buildings');
      },
    });
  }

  loadZones() {
    this.service.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
      },
      error: () => {
        this.errorMessage.set('Failed to load zones');
      },
    });
  }

  loadLocations() {
    this.service.getLocations().subscribe({
      next: (locations) => {
        this.locations.set(locations);
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set('Failed to load locations');
      },
    });
  }

  newLocationForm() {
    this.selectedLocation = null;
    this.form.reset();
    this.form.patchValue({ code: '' });
    this.finalCode = '';
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  editLocation(location: Location) {
    this.selectedLocation = location;
    this.form.setValue({
      shelf: location.shelf ?? '',
      zone_id: location.zone_id ?? location.zone?.id ?? null,
      code: location.code ?? '',
    } as { shelf: string; zone_id: number | null; code: string });
    this.finalCode = this.getFinalCode(location);
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  saveLocation() {
    const value = this.form.value;
    if (!value.shelf?.trim() || !value.zone_id || !value.code?.trim()) {
      this.errorMessage.set('Shelf, zone, and code are required.');
      return;
    }
    const payload = {
      shelf: value.shelf,
      zone_id: value.zone_id,
      code: value.code,
    };
    if (this.selectedLocation) {
      this.service.updateLocation(this.selectedLocation.id, payload).subscribe({
        next: () => {
          this.loadLocations();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to update location');
          }
        },
      });
    } else {
      this.service.addLocation(payload).subscribe({
        next: () => {
          this.loadLocations();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to add location');
          }
        },
      });
    }
  }

  onShelfInput() {
    const shelf = this.form.value.shelf ?? '';
    const zone_id = this.form.value.zone_id ? +this.form.value.zone_id : undefined;
    const code = LocationService.generateCode(shelf || '');
    // Only auto-generate code for new locations
    if (!this.selectedLocation) {
      this.form.patchValue({ code });
    }
    // Always update final code field
    this.finalCode = this.getFinalCode({
      shelf: shelf,
      code: this.form.value.code ?? code,
      zone: this.zones().find((z) => z.id === zone_id),
    });
  }

  getFinalCode(location: Partial<Location>): string {
    // Concatenate codes: building-zone for zones, building-zone-location for locations
    const zone = location.zone;
    const buildingCode = zone?.building?.code ?? '';
    const zoneCode = zone?.code ?? '';
    const locCode = location.code ?? '';
    if (buildingCode && zoneCode && locCode) {
      return `${buildingCode}-${zoneCode}-${locCode}`;
    } else if (buildingCode && zoneCode) {
      return `${buildingCode}-${zoneCode}`;
    } else if (zoneCode) {
      return zoneCode;
    }
    return '';
  }

  deleteLocation(location: Location) {
    this.locationToDelete = location;
    this.showDeleteModal = true;
  }

  deleteLocationConfirmed() {
    if (!this.locationToDelete) return;
    this.service.deleteLocation(this.locationToDelete.id).subscribe({
      next: () => {
        this.loadLocations();
        this.locationToDelete = null;
        this.showDeleteModal = false;
      },
      error: () => {
        this.errorMessage.set('Failed to delete location');
        this.showDeleteModal = false;
      },
    });
  }

  cancelDeleteLocation() {
    this.locationToDelete = null;
    this.showDeleteModal = false;
  }

  cancel() {
    this.showForm.set(false);
    this.errorMessage.set(null);
  }
}
