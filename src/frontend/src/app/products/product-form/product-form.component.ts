import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Product } from '../product.service';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { inject } from '@angular/core';
import { LocationService, Location } from '../../locations/locations-list/location.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ComboboxComponent } from '../../shared/combobox/combobox.component';
import { ProductColorService } from '../product-color.service';
import { ProductConditionService } from '../product-condition.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ComboboxComponent],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnChanges, OnInit {
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter<Product>();
  @Output() cancelForm = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private locationService = inject(LocationService);
  private colorService = inject(ProductColorService);
  private conditionService = inject(ProductConditionService);
  conditionOptions = signal<string[]>([]);
  locations = signal<Location[]>([]);
  colorOptions = signal<string[]>([]);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      id: [0],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      condition: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      length: [0, [Validators.min(0)]],
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
      color: [''],
      weight: [0, [Validators.min(0)]],
      destination: [''],
      visibility: ['private', Validators.required],
      location_id: [0, Validators.required],
      images: [[]],
    });
    this.loadLocations();
  }

  ngOnInit() {
    this.colorService.getColors().subscribe({
      next: (colors: string[]) => this.colorOptions.set(colors),
      error: () => this.colorOptions.set([]),
    });
    this.conditionService.getConditions().subscribe({
      next: (conds: string[]) => this.conditionOptions.set(conds),
      error: () => this.conditionOptions.set([]),
    });
  }

  get selectedProduct(): Product | null {
    return this.product;
  }

  capitalize(value: string): string {
    if (!value) {
      return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  loadLocations() {
    this.locationService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => this.locations.set([]),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && this.product) {
      this.form.patchValue({ ...this.product });
    } else if (changes['product'] && !this.product) {
      this.form.reset({
        id: 0,
        title: '',
        description: '',
        condition: '',
        quantity: 0,
        length: 0,
        width: 0,
        height: 0,
        color: '',
        weight: 0,
        destination: '',
        visibility: 'private',
        location_id: 0,
        images: [],
      });
    }
  }

  onColorChange(value: string) {
    this.form.get('color')?.setValue(value.toLowerCase());
  }

  onConditionChange(value: string) {
    this.form.get('condition')?.setValue(value.toLowerCase());
  }

  onAddNewCondition(value: string) {
    const cond = value.toLowerCase();
    if (!this.conditionOptions().includes(cond)) {
      const updated = [...this.conditionOptions(), cond];
      this.conditionOptions.set(updated);
    }
    this.form.get('condition')?.setValue(cond);
  }

  onAddNewColor(value: string) {
    const color = value.toLowerCase();
    if (!this.colorOptions().includes(color)) {
      const updated = [...this.colorOptions(), color];
      this.colorOptions.set(updated);
    }
    this.form.get('color')?.setValue(color);
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }

  onCancel() {
    this.cancelForm.emit();
    this.form.reset({
      id: 0,
      title: '',
      description: '',
      condition: '',
      quantity: 0,
      length: 0,
      width: 0,
      height: 0,
      color: '',
      weight: 0,
      destination: '',
      visibility: 'private',
      location_id: 0,
      images: [],
    });
  }

  getFinalCode(location: Location): string {
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
}
