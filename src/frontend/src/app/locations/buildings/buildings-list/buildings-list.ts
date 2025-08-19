import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocationService, Building } from '../../locations-list/location.service';
import { ConfirmModal } from '../../../shared/confirm-modal/confirm-modal';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-buildings-list',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmModal, TranslateModule],
  templateUrl: './buildings-list.html',
  styleUrl: './buildings-list.scss',
})
export class BuildingsList {
  buildings = signal<Building[]>([]);
  errorMessage = signal<string | null>(null);
  showForm = signal(false);
  selectedBuilding: Building | null = null;
  form: FormGroup;
  showDeleteModal = false;
  buildingToDelete: Building | null = null;

  private fb = inject(FormBuilder);
  private service = inject(LocationService);
  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
    });
    this.loadBuildings();
  }

  loadBuildings() {
    this.service.getBuildings().subscribe({
      next: (buildings) => {
        this.buildings.set(buildings);
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set('Failed to load buildings');
      },
    });
  }

  newBuildingForm() {
    this.selectedBuilding = null;
    this.form.reset();
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  editBuilding(building: Building) {
    this.selectedBuilding = building;
    this.form.setValue({ name: building.name });
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  saveBuilding() {
    if (this.form.invalid) {
      this.errorMessage.set('Name is required.');
      return;
    }
    const payload = { name: this.form.value.name };
    if (this.selectedBuilding) {
      this.service.updateBuilding(this.selectedBuilding.id, payload).subscribe({
        next: () => {
          this.loadBuildings();
          this.showForm.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to update building');
        },
      });
    } else {
      this.service.addBuilding(payload).subscribe({
        next: () => {
          this.loadBuildings();
          this.showForm.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to add building');
        },
      });
    }
  }

  confirmDeleteBuilding(building: Building) {
    this.buildingToDelete = building;
    this.showDeleteModal = true;
  }

  deleteBuildingConfirmed() {
    if (!this.buildingToDelete) return;
    this.service.deleteBuilding(this.buildingToDelete.id).subscribe({
      next: () => {
        this.loadBuildings();
        this.buildingToDelete = null;
        this.showDeleteModal = false;
      },
      error: () => {
        this.errorMessage.set('Failed to delete building');
        this.showDeleteModal = false;
      },
    });
  }

  cancelDeleteBuilding() {
    this.buildingToDelete = null;
    this.showDeleteModal = false;
  }

  cancel() {
    this.showForm.set(false);
    this.errorMessage.set(null);
  }
}
