import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocationService, Location, Building, Zone } from './location.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { ListShellComponent } from '../../shared/list-shell/list-shell.component';
import { DropdownService } from '../../shared/dropdown.service';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, TranslateModule, ListShellComponent],
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

  locationSearchFn = (loc: Location, q: string) =>
    (loc.shelf ?? '').toLowerCase().includes(q) ||
    (loc.zone?.name ?? '').toLowerCase().includes(q) ||
    (loc.zone?.building?.name ?? '').toLowerCase().includes(q) ||
    (loc.code ?? '').toLowerCase().includes(q);
  private translate = inject(TranslateService);
  private service = inject(LocationService);
  private fb = inject(FormBuilder);
  private dropdown = inject(DropdownService);
  form = this.fb.group({
    shelf: ['', [Validators.required]],
    zone_id: [null as number | null, [Validators.required]],
    code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
  });
  finalCode = '';
  codeChangedManually = false;

  get isCodeUnique(): boolean {
    const code = this.form.value.code?.trim().toUpperCase();
    const zoneId = this.form.value.zone_id ? +this.form.value.zone_id : null;
    if (!code || !zoneId) return false;
    return !this.locations().some(
      (l) =>
        l.code?.toUpperCase() === code &&
        (l.zone_id ?? l.zone?.id) === zoneId &&
        l.id !== this.selectedLocation?.id,
    );
  }

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
    this.codeChangedManually = false;
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
    this.codeChangedManually = true;
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
    let autoCode = LocationService.generateCode(shelf || '');
    autoCode = autoCode.toUpperCase();
    if (!this.codeChangedManually && this.form.value.code !== autoCode) {
      this.form.patchValue({ code: autoCode });
    }
    this.updateFinalCode();
  }

  onCodeInput() {
    this.codeChangedManually = true;
    // Always convert code to uppercase on manual input
    const code = this.form.value.code;
    if (code && code !== code.toUpperCase()) {
      this.form.patchValue({ code: code.toUpperCase() });
    }
    this.updateFinalCode();
  }

  onCodeBlur() {
    if (!this.form.value.code) {
      this.codeChangedManually = false;
    }
  }

  updateFinalCode() {
    const shelf = this.form.value.shelf ?? '';
    const zone_id = this.form.value.zone_id ? +this.form.value.zone_id : undefined;
    const zone = this.zones().find((z) => z.id === zone_id);
    this.finalCode = this.getFinalCode({
      shelf: shelf,
      code: this.form.value.code ?? '',
      zone: zone,
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

  openDropdown(location: Location, e: MouseEvent) {
    this.dropdown.open(
      [
        { label: this.translate.instant('EDIT'), action: () => this.editLocation(location) },
        {
          label: this.translate.instant('DELETE'),
          danger: true,
          action: () => this.deleteLocation(location),
        },
      ],
      e,
    );
  }

  cancel() {
    this.showForm.set(false);
    this.errorMessage.set(null);
  }
}
