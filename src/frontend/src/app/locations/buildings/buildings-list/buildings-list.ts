import { Component, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DropdownService } from '../../../shared/dropdown.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocationService, Building } from '../../locations-list/location.service';
import { ConfirmModal } from '../../../shared/confirm-modal/confirm-modal';
import { TranslateModule } from '@ngx-translate/core';
import { ListShellComponent } from '../../../shared/list-shell/list-shell.component';

@Component({
  selector: 'app-buildings-list',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmModal, TranslateModule, ListShellComponent],
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
  codeChangedManually = false;

  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private service = inject(LocationService);
  private dropdown = inject(DropdownService);

  buildingSearchFn = (b: Building, q: string) =>
    (b.name ?? '').toLowerCase().includes(q) ||
    (b.code ?? '').toLowerCase().includes(q);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    });
    this.form.valueChanges.subscribe(() => {
      // Optionally, update any preview code here
    });
    this.loadBuildings();
  }

  get isCodeUnique(): boolean {
    const code = this.form.value.code?.trim().toUpperCase();
    if (!code) return false;
    return !this.buildings().some(
      (b) => b.code?.toUpperCase() === code && b.id !== this.selectedBuilding?.id
    );
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
    this.form.patchValue({ code: '' });
    this.codeChangedManually = false;
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  editBuilding(building: Building) {
    this.selectedBuilding = building;
    this.form.setValue({ name: building.name, code: building.code });
    this.codeChangedManually = true;
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  saveBuilding() {
    if (this.form.invalid) {
      this.errorMessage.set('Name and code are required.');
      return;
    }
    const payload = { name: this.form.value.name, code: this.form.value.code };
    if (this.selectedBuilding) {
      this.service.updateBuilding(this.selectedBuilding.id, payload).subscribe({
        next: () => {
          this.loadBuildings();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to update building');
          }
        },
      });
    } else {
      this.service.addBuilding(payload).subscribe({
        next: () => {
          this.loadBuildings();
          this.showForm.set(false);
        },
        error: (err) => {
          if (err?.error?.error === 'ERROR_VALIDATION' && err?.error?.errors) {
            this.errorMessage.set(Object.values(err.error.errors).flat().join(' '));
          } else {
            this.errorMessage.set('Failed to add building');
          }
        },
      });
    }
  }

  onNameInput() {
    // Regenerate code from name if code was not changed manually
    if (!this.codeChangedManually) {
      const name = this.form.value.name;
      let code = LocationService.generateCode(name);
      code = code.toUpperCase();
      this.form.patchValue({ code });
    }
  }

  onCodeInput() {
    this.codeChangedManually = true;
    // Always convert code to uppercase on manual input
    const code = this.form.value.code;
    if (code && code !== code.toUpperCase()) {
      this.form.patchValue({ code: code.toUpperCase() });
    }
  }

  onCodeBlur() {
    if (!this.form.value.code) {
      this.codeChangedManually = false;
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

  openDropdown(building: Building, e: MouseEvent) {
    this.dropdown.open([
      { label: this.translate.instant('EDIT'), action: () => this.editBuilding(building) },
      { label: this.translate.instant('DELETE'), danger: true, action: () => this.confirmDeleteBuilding(building) },
    ], e);
  }

  cancel() {
    this.showForm.set(false);
    this.errorMessage.set(null);
  }
}
