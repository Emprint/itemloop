export enum DestinationOption {
  REVIEW = 'review',
  KEEP = 'keep',
  REUSE = 'reuse',
  SELL = 'sell',
  DONATE = 'donate',
  RECYCLE = 'recycle',
  TRASH = 'trash',
}

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
import { Product, ProductService, Image } from '../product.service';
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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CartService } from '../../cart/cart.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ComboboxComponent, DragDropModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnChanges, OnInit {
  destinationOptions = Object.values(DestinationOption);
  private categoryService = inject(ProductCategoryService);

  colors = signal<IdNamePair[]>([]);
  conditions = signal<IdNamePair[]>([]);
  categoryNames = computed(() => this.categories().map((c) => c.name));
  colorNames = computed(() => this.colors().map((c) => c.name));
  conditionNames = computed(() => this.conditions().map((c) => c.name));

  @Input() product: Product | null = null;
  @Input() readOnly = false;
  @Input() canEdit = false;
  @Output() saveEvent = new EventEmitter<Product>();
  @Output() cancelEvent = new EventEmitter<void>();
  @Output() saveContinueEvent = new EventEmitter<Product>();
  @Output() editModeEvent = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private locationService = inject(LocationService);
  private colorService = inject(ProductColorService);
  private conditionService = inject(ProductConditionService);
  private productService = inject(ProductService);
  readonly cartService = inject(CartService);

  // Cart qty picker (view mode)
  cartQty = signal(1);
  cartAdded = signal(false);
  maxCartQty = computed(() => this.product?.quantity ?? 1);

  decrementCartQty() { this.cartQty.update(v => Math.max(1, v - 1)); }
  incrementCartQty() { this.cartQty.update(v => Math.min(this.maxCartQty(), v + 1)); }
  setCartQty(v: number) { this.cartQty.set(Math.min(Math.max(1, v), this.maxCartQty())); }

  addToCart() {
    if (!this.product || this.product.quantity < 1) return;
    this.cartService.addToCart(this.product, this.cartQty());
    this.cartAdded.set(true);
    setTimeout(() => this.cartAdded.set(false), 2000);
  }

  locations = signal<Location[]>([]);
  categories = signal<{ id: number; name: string }[]>([]);
  images = signal<Image[]>([]);
  imageError = signal<string | null>(null);
  isDragging = signal(false);

  // Cascade location signals
  cascadeBuildingId = signal<number>(0);
  cascadeZoneId = signal<number>(0);
  selectedShelfLocationId = signal<number>(0);

  uniqueBuildings = computed(() => {
    const seen = new Set<number>();
    return this.locations()
      .filter(l => l.zone?.building)
      .filter(l => {
        const bid = l.zone!.building!.id;
        if (seen.has(bid)) return false;
        seen.add(bid);
        return true;
      })
      .map(l => l.zone!.building!);
  });

  filteredZones = computed(() => {
    const bid = this.cascadeBuildingId();
    if (!bid) return [];
    const seen = new Set<number>();
    return this.locations()
      .filter(l => l.zone?.building?.id === bid && l.zone)
      .filter(l => {
        if (seen.has(l.zone!.id)) return false;
        seen.add(l.zone!.id);
        return true;
      })
      .map(l => l.zone!);
  });

  filteredShelves = computed(() => {
    const bid = this.cascadeBuildingId();
    const zid = this.cascadeZoneId();
    if (!bid || !zid) return [];
    return this.locations().filter(l => l.zone?.building?.id === bid && l.zone?.id === zid);
  });

  selectedLocation = computed(() =>
    this.locations().find(l => l.id === this.selectedShelfLocationId())
  );

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      id: [0],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      condition: [null, Validators.required],
      condition_id: [0],
      quantity: [0, [Validators.required, Validators.min(0)]],
      length: [0, [Validators.min(0)]],
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
      color: [null],
      color_id: [0],
      category: [null, Validators.required],
      category_id: [0],
      estimated_value: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],
      destination: [''],
      visibility: ['private', Validators.required],
      location_id: [0, Validators.required],
      barcode: [''],
      images: [[]],
    });
  }

  ngOnInit() {
    if (this.product) {
      this.form.patchValue({
        ...this.product,
        location_id: this.product.location?.id ?? this.product.location_id ?? 0,
      });
      this.images.set(this.product.images ?? []);
    }
    this.loadLocations();
    this.categoryService.getCategories().subscribe({
      next: (categories: IdNamePair[]) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.colorService.getColors().subscribe({
      next: (colors: IdNamePair[]) => this.colors.set(colors),
      error: () => this.colors.set([]),
    });
    this.conditionService.getConditions().subscribe({
      next: (conds: IdNamePair[]) => this.conditions.set(conds),
      error: () => this.conditions.set([]),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && !this.product) {
      this.resetForm();
    }
    if (changes['product']) {
      this.cartQty.set(1);
      this.cartAdded.set(false);
    }
  }

  loadLocations() {
    this.locationService.getLocations().subscribe({
      next: (locs) => {
        this.locations.set(locs);
        // Pre-populate cascade for edit mode
        if (this.product?.location) {
          const loc = this.product.location;
          const locationId = loc.id ?? this.product.location_id ?? 0;
          const zoneId = loc.zone?.id ?? 0;
          const buildingId = loc.building?.id ?? 0;
          if (buildingId) this.cascadeBuildingId.set(buildingId);
          if (zoneId) this.cascadeZoneId.set(zoneId);
          if (locationId) this.selectedShelfLocationId.set(locationId);
        }
      },
      error: () => this.locations.set([]),
    });
  }

  resetForm() {
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
      estimated_value: 0,
      destination: '',
      visibility: 'private',
      location_id: 0,
      barcode: '',
      images: [],
    });
    this.cascadeBuildingId.set(0);
    this.cascadeZoneId.set(0);
    this.selectedShelfLocationId.set(0);
  }

  get isPublic(): boolean {
    return this.form.get('visibility')?.value === 'public';
  }

  toggleVisibility() {
    const current = this.form.get('visibility')?.value;
    this.form.get('visibility')?.setValue(current === 'public' ? 'private' : 'public');
  }

  onBuildingChange(bid: number) {
    this.cascadeBuildingId.set(bid);
    this.cascadeZoneId.set(0);
    this.selectedShelfLocationId.set(0);
    this.form.get('location_id')?.setValue(0);
  }

  onZoneChange(zid: number) {
    this.cascadeZoneId.set(zid);
    this.selectedShelfLocationId.set(0);
    this.form.get('location_id')?.setValue(0);
  }

  onShelfChange(locationId: number) {
    this.selectedShelfLocationId.set(locationId);
    this.form.get('location_id')?.setValue(locationId);
  }

  get selectedProduct(): Product | null {
    return this.product;
  }

  onImageFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.product) return;
    this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  onFileDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onFileDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (!this.product) return;
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) this.uploadFiles(files);
  }

  private uploadFiles(files: File[]) {
    if (!this.product) return;
    this.imageError.set(null);
    this.productService.uploadImages(this.product.id, files).subscribe({
      next: (res) => this.images.update(imgs => [...imgs, ...res.images]),
      error: () => this.imageError.set('Image upload failed.'),
    });
  }

  deleteImage(imageId: number) {
    if (!this.product) return;
    this.productService.deleteImage(this.product.id, imageId).subscribe({
      next: () => this.images.update(imgs => imgs.filter(i => i.id !== imageId)),
      error: () => this.imageError.set('Failed to delete image.'),
    });
  }

  onImageDrop(event: CdkDragDrop<Image[]>) {
    if (!this.product) return;
    const imgs = [...this.images()];
    moveItemInArray(imgs, event.previousIndex, event.currentIndex);
    this.images.set(imgs);
    const ids = imgs.map(i => i.id);
    this.productService.reorderImages(this.product.id, ids).subscribe({
      error: () => this.imageError.set('Failed to save image order.'),
    });
  }

  capitalize(value?: string): string {
    if (!value || value.length === 0) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return dateStr.substring(0, 10);
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    return dateStr.substring(0, 16).replace('T', ' ');
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

  private buildPayload(): Product {
    const colorObj = this.form.get('color')?.value as IdNamePair;
    const conditionObj = this.form.get('condition')?.value as IdNamePair;
    const categoryObj = this.form.get('category')?.value as IdNamePair;
    return {
      ...this.form.value,
      color: colorObj,
      color_id: colorObj?.id ?? 0,
      condition: conditionObj,
      condition_id: conditionObj?.id ?? 0,
      category: categoryObj,
      category_id: categoryObj?.id ?? 0,
    };
  }

  onSubmit() {
    if (this.form.valid) {
      this.saveEvent.emit(this.buildPayload());
    }
  }

  onSaveAndContinue() {
    if (this.form.valid) {
      this.saveContinueEvent.emit(this.buildPayload());
    }
  }

  onCancel() {
    this.cancelEvent.emit();
    this.resetForm();
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
