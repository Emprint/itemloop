interface IdNamePair {
  id: number;
  name: string;
}
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  SimpleChanges,
  signal,
  computed,
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
import { ProductCategoryService } from '../product-category.service';
import { ProductConditionService } from '../product-condition.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ComboboxComponent],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnChanges, OnInit {
  // Track when all options are loaded
  private optionsLoaded = signal(false);
  private categoryService = inject(ProductCategoryService);
  // ...existing code...
  colors = signal<IdNamePair[]>([]);
  conditions = signal<IdNamePair[]>([]);
  categoryNames = computed(() => this.categories().map((c) => c.name));
  colorNames = computed(() => this.colors().map((c) => c.name));
  conditionNames = computed(() => this.conditions().map((c) => c.name));
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter<Product>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private locationService = inject(LocationService);
  private colorService = inject(ProductColorService);
  private conditionService = inject(ProductConditionService);
  locations = signal<Location[]>([]);
  categories = signal<{ id: number; name: string }[]>([]);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      id: [0],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      condition: [null, Validators.required], // IdNamePair
      condition_id: [0],
      quantity: [0, [Validators.required, Validators.min(0)]],
      length: [0, [Validators.min(0)]],
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
      color: [null], // IdNamePair
      color_id: [0],
      category: [null], // IdNamePair
      category_id: [0],
      weight: [0, [Validators.min(0)]],
      destination: [''],
      visibility: ['private', Validators.required],
      location_id: [0, Validators.required],
      images: [[]],
    });
    this.loadLocations();
  }

  ngOnInit() {
    // Patch form values with product object for editing
    if (this.product) {
      this.form.patchValue({
        ...this.product,
      });
    }
    let loaded = 0;
    const checkLoaded = () => {
      loaded++;
      if (loaded === 3) this.optionsLoaded.set(true);
    };
    this.categoryService.getCategories().subscribe({
      next: (categories: IdNamePair[]) => {
        this.categories.set(categories);
        checkLoaded();
      },
      error: () => {
        this.categories.set([]);
        checkLoaded();
      },
    });
    this.colorService.getColors().subscribe({
      next: (colors: IdNamePair[]) => {
        this.colors.set(colors);
        checkLoaded();
      },
      error: () => {
        this.colors.set([]);
        checkLoaded();
      },
    });
    this.conditionService.getConditions().subscribe({
      next: (conds: IdNamePair[]) => {
        this.conditions.set(conds);
        checkLoaded();
      },
      error: () => {
        this.conditions.set([]);
        checkLoaded();
      },
    });
  }

  get selectedProduct(): Product | null {
    return this.product;
  }

  capitalize(value?: string): string {
    if (!value || value.length === 0) {
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
    if (changes['product'] && !this.product) {
      this.form.reset({
        id: 0,
        title: '',
        description: '',
        condition: null,
        condition_id: 0,
        quantity: 0,
        length: 0,
        width: 0,
        height: 0,
        color: null,
        color_id: 0,
        category: null,
        category_id: 0,
        weight: 0,
        destination: '',
        visibility: 'private',
        location_id: 0,
        images: [],
      });
    }
  }

  onCategoryChange(value: string) {
    const categoryObj = this.categories().find((c) => c.name.toLowerCase() === value.toLowerCase());
    this.form.get('category')?.setValue(categoryObj ?? { id: 0, name: value });
  }

  onAddNewCategory(value: string) {
    const category = value.toLowerCase();
    if (!this.categoryNames().includes(category)) {
      const updated = [...this.categories(), { id: 0, name: category }];
      this.categories.set(updated);
    }
    this.form.get('category')?.setValue({ id: 0, name: category });
  }

  onColorChange(value: string) {
    const colorObj = this.colors().find((c) => c.name.toLowerCase() === value.toLowerCase());
    this.form.get('color')?.setValue(colorObj ?? { id: 0, name: value });
  }

  onConditionChange(value: string) {
    const conditionObj = this.conditions().find(
      (c) => c.name.toLowerCase() === value.toLowerCase(),
    );
    this.form.get('condition')?.setValue(conditionObj ?? { id: 0, name: value });
  }

  onAddNewCondition(value: string) {
    const cond = value.toLowerCase();
    const exists = this.conditionNames().some((name) => name.toLowerCase() === cond);
    if (!exists) {
      this.form.get('condition_id')?.setValue(0);
    }
  }

  onAddNewColor(value: string) {
    const color = value.toLowerCase();
    const exists = this.colorNames().some((name) => name.toLowerCase() === color);
    if (!exists) {
      this.form.get('color_id')?.setValue(0);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const colorObj = this.form.get('color')?.value as IdNamePair;
      const conditionObj = this.form.get('condition')?.value as IdNamePair;
      const categoryObj = this.form.get('category')?.value as IdNamePair;
      const payload = {
        ...this.form.value,
        color: colorObj,
        color_id: colorObj?.id ?? 0,
        condition: conditionObj,
        condition_id: conditionObj?.id ?? 0,
        category: categoryObj,
        category_id: categoryObj?.id ?? 0,
      };
      this.save.emit(payload);
    }
  }

  onCancel() {
    this.cancel.emit();
    this.form.reset({
      id: 0,
      title: '',
      description: '',
      condition: null,
      condition_id: 0,
      quantity: 0,
      length: 0,
      width: 0,
      height: 0,
      color: null,
      color_id: 0,
      category: null,
      category_id: 0,
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
