import { ConfirmModal } from '../../../shared/confirm-modal/confirm-modal';
import { Component, signal, inject } from '@angular/core';
import { LocationService, Zone, Building } from '../../locations-list/location.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-zones-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, TranslateModule],
  templateUrl: './zones-list.html',
  styleUrl: './zones-list.scss',
})
export class ZonesList {
  showDeleteModal = false;
  zoneToDelete: Zone | null = null;
  zones = signal<Zone[]>([]);
  buildings = signal<Building[]>([]);
  errorMessage = signal<string | null>(null);
  showForm = signal(false);
  selectedZone: Zone | null = null;
  form: FormGroup;
  finalZoneCode = '';

  private fb = inject(FormBuilder);
  private service = inject(LocationService);
  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      building_id: ['', [Validators.required]],
      code: ['', [Validators.required, Validators.maxLength(3)]],
    });
    this.form.valueChanges.subscribe(() => {
      this.updateFinalZoneCode();
    });
    this.loadZones();
    this.loadBuildings();
  }

  onBuildingChange() {
    this.updateFinalZoneCode();
  }
  updateFinalZoneCode() {
    const buildingId = this.form.value.building_id;
    const code = this.form.value.code || '';
    if (buildingId) {
      const building = this.buildings().find((b) => b.id == Number(buildingId));
      this.finalZoneCode = (building?.code || '') + '-' + code;
    } else {
      this.finalZoneCode = code;
    }
  }

  loadZones() {
    this.service.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set('Failed to load zones');
      },
    });
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

  newZoneForm() {
    this.selectedZone = null;
    this.form.reset();
    this.form.patchValue({ code: '' });
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  editZone(zone: Zone) {
    this.selectedZone = zone;
    this.form.setValue({ name: zone.name, building_id: zone.building_id, code: zone.code });
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  saveZone() {
    if (this.form.invalid) {
      this.errorMessage.set('Name, code, and building are required.');
      return;
    }
    const payload = {
      name: this.form.value.name,
      building_id: this.form.value.building_id,
      code: this.form.value.code,
    };
    if (this.selectedZone) {
      this.service.updateZone(this.selectedZone.id, payload).subscribe({
        next: () => {
          this.loadZones();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to update zone');
          }
        },
      });
    } else {
      this.service.addZone(payload).subscribe({
        next: () => {
          this.loadZones();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to add zone');
          }
        },
      });
    }
  }

  onNameInput() {
    if (!this.selectedZone) {
      const name = this.form.value.name;
      const code = LocationService.generateCode(name);
      this.form.patchValue({ code });
    }
  }

  confirmDeleteZone(zone: Zone) {
    this.zoneToDelete = zone;
    this.showDeleteModal = true;
  }

  deleteZoneConfirmed() {
    if (!this.zoneToDelete) return;
    this.service.deleteZone(this.zoneToDelete.id).subscribe({
      next: () => {
        this.loadZones();
        this.zoneToDelete = null;
        this.showDeleteModal = false;
      },
      error: () => {
        this.errorMessage.set('Failed to delete zone');
        this.showDeleteModal = false;
      },
    });
  }

  cancelDeleteZone() {
    this.zoneToDelete = null;
    this.showDeleteModal = false;
  }

  cancel() {
    this.showForm.set(false);
    this.errorMessage.set(null);
  }
}
