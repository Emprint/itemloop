import { Component, signal, computed, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { ProductService, Product } from '../product.service';
import { ProductFormComponent } from '../product-form/product-form.component';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';
import { AppSettingsService, AppSettings } from '../../admin/app-settings.service';
import { DropdownService, DropdownItem } from '../../shared/dropdown.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { BarcodeScannerComponent } from '../../shared/barcode-scanner/barcode-scanner.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    ProductFormComponent,
    TranslateModule,
    FormsModule,
    LocaleDatePipe,
    ConfirmModal,
    BarcodeScannerComponent,
  ],
  templateUrl: './products-list.html',
  styleUrl: './products-list.scss',
})
export class ProductsList {
  private auth = inject(AuthService);
  private service = inject(ProductService);
  private dropdown = inject(DropdownService);
  private translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsService);

  readonly settings = toSignal(this.appSettingsService.getAll(), {
    initialValue: {} as AppSettings,
  });
  readonly currency = computed(() => this.settings()['currency'] || 'EUR');

  products = signal<Product[]>([]);
  errorMessage: string | null = null;
  showForm = signal(false);
  selectedProduct: Product | null = null;
  isReadOnlyForm = false;
  showDeleteModal = signal(false);
  productToDelete: Product | null = null;
  saveSuccess = signal(false);
  isEditorOrAdmin = computed(() => {
    const user = this.auth.user();
    return !!user && (user.role === UserRole.Admin || user.role === UserRole.Editor);
  });

  searchQuery = signal('');
  selectedCondition = signal('');
  selectedLocation = signal('');
  selectedCategory = signal('');
  viewMode = signal<'list' | 'grid'>(window.innerWidth <= 768 ? 'grid' : 'list');
  pageSize = signal(10);
  currentPage = signal(1);
  showBarcodeScanner = signal(false);

  conditionOptions = computed(
    () =>
      [
        ...new Set(
          this.products()
            .map((p) => p.condition?.name)
            .filter(Boolean),
        ),
      ].sort() as string[],
  );
  locationOptions = computed(
    () =>
      [
        ...new Set(
          this.products()
            .map((p) => p.location?.building?.name)
            .filter(Boolean),
        ),
      ].sort() as string[],
  );
  categoryOptions = computed(
    () =>
      [
        ...new Set(
          this.products()
            .map((p) => p.category?.name)
            .filter(Boolean),
        ),
      ].sort() as string[],
  );

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const cond = this.selectedCondition();
    const loc = this.selectedLocation();
    const cat = this.selectedCategory();
    return this.products().filter((p) => {
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !(p.description ?? '').toLowerCase().includes(q) &&
        !this.productCode(p.id).toLowerCase().includes(q) &&
        !(p.barcode ?? '').toLowerCase().includes(q)
      )
        return false;
      if (cond && p.condition?.name !== cond) return false;
      if (loc && p.location?.building?.name !== loc) return false;
      if (cat && p.category?.name !== cat) return false;
      return true;
    });
  });

  totalProducts = computed(() => this.filteredProducts().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalProducts() / this.pageSize())));

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1) as (number | '...')[];
    const pages: (number | '...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  });

  constructor() {
    this.loadProducts();
  }

  loadProducts() {
    this.service.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.errorMessage = null;
      },
      error: () => {
        this.errorMessage = 'Failed to load products';
      },
    });
  }

  showAddProductForm() {
    this.selectedProduct = null;
    this.isReadOnlyForm = false;
    this.showForm.set(true);
  }

  viewProduct(product: Product) {
    this.selectedProduct = product;
    this.isReadOnlyForm = true;
    this.showForm.set(true);
  }

  onSwitchToEdit() {
    this.isReadOnlyForm = false;
  }

  editProduct(product: Product) {
    this.selectedProduct = product;
    this.isReadOnlyForm = false;
    this.showForm.set(true);
  }

  deleteProduct(product: Product) {
    this.productToDelete = product;
    this.showDeleteModal.set(true);
  }

  onDeleteFromForm() {
    if (!this.selectedProduct) return;
    this.productToDelete = this.selectedProduct;
    this.showDeleteModal.set(true);
  }

  confirmDeleteProduct() {
    if (!this.productToDelete) return;
    const product = this.productToDelete;
    this.showDeleteModal.set(false);
    this.productToDelete = null;
    this.service.deleteProduct(product.id).subscribe({
      next: () => {
        this.showForm.set(false);
        this.selectedProduct = null;
        this.loadProducts();
      },
      error: () => {
        this.errorMessage = this.translate.instant('ERRORS.FAILED_DELETE_PRODUCT');
      },
    });
  }

  cancelDeleteProduct() {
    this.productToDelete = null;
    this.showDeleteModal.set(false);
  }

  onSaveProduct(product: Product) {
    const save$ = this.selectedProduct
      ? this.service.updateProduct(this.selectedProduct.id, product)
      : this.service.addProduct(product);
    save$.subscribe({
      next: () => this.completeProductSave(),
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractError(err, 'Failed to save product');
      },
    });
  }

  onSaveProductContinue(product: Product) {
    const save$ = this.selectedProduct
      ? this.service.updateProduct(this.selectedProduct.id, product)
      : this.service.addProduct(product);
    save$.subscribe({
      next: (saved: Product) => {
        this.loadProducts();
        this.selectedProduct = saved;
        this.errorMessage = null;
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractError(err, 'Failed to save product');
      },
    });
  }

  onCancelProduct() {
    this.showForm.set(false);
    this.selectedProduct = null;
  }

  private completeProductSave() {
    this.loadProducts();
    this.showForm.set(false);
    this.selectedProduct = null;
    this.errorMessage = null;
  }

  productCode(id: number) {
    return `PRD-${String(id).padStart(6, '0')}`;
  }

  capitalize(s?: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  locationDisplay(p: Product) {
    const b = p.location?.building?.name ?? '';
    const z = p.location?.zone?.name ?? '';
    const s = p.location?.shelf ?? '';
    return { top: b, bottom: [z, s].filter(Boolean).join(' / ') };
  }

  conditionClass(name?: string) {
    const n = name?.toLowerCase() ?? '';
    if (['excellent', 'parfait', 'neuf', 'mint'].some((k) => n.includes(k)))
      return 'badge-excellent';
    if (['good', 'bon', 'gut', 'bueno'].some((k) => n.includes(k))) return 'badge-good';
    if (['fair', 'abi', 'use', 'usé', 'average', 'moyen'].some((k) => n.includes(k)))
      return 'badge-fair';
    if (['poor', 'mauvais', 'bad', 'broken', 'cassé'].some((k) => n.includes(k)))
      return 'badge-poor';
    return 'badge-default';
  }

  formatDate(d?: string) {
    return d ? d.substring(0, 10) : '—';
  }

  formatValue(v?: number | null) {
    if (v == null) return '—';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.currency(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }

  clampedPageRange() {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalProducts());
    return { start, end };
  }

  openDropdown(product: Product, e: MouseEvent) {
    const items: DropdownItem[] = [
      { label: this.translate.instant('VIEW'), action: () => this.viewProduct(product) },
    ];
    if (this.isEditorOrAdmin()) {
      items.push(
        { label: this.translate.instant('EDIT'), action: () => this.editProduct(product) },
        {
          label: this.translate.instant('DELETE'),
          danger: true,
          action: () => this.deleteProduct(product),
        },
      );
    }
    this.dropdown.open(items, e);
  }

  setPage(p: number | '...') {
    if (typeof p !== 'number') return;
    this.currentPage.set(p);
  }

  onSearch(v: string) {
    this.searchQuery.set(v);
    this.currentPage.set(1);
  }
  onFilterChange() {
    this.currentPage.set(1);
  }
  onPageSizeChange(v: number) {
    this.pageSize.set(v);
    this.currentPage.set(1);
  }

  private extractError(err: HttpErrorResponse, fallback: string): string {
    const body = err.error;
    if (body?.errors) {
      return Object.values(body.errors).flat().join(' ');
    }
    return body?.message ?? body?.error ?? fallback;
  }

  exportCsv() {
    const headers = [
      'Code',
      'Title',
      'Category',
      'Condition',
      'Location',
      'Quantity',
      'Est. Value',
      'Barcode',
      'Date Added',
    ];
    const lines = this.filteredProducts().map((p) =>
      [
        this.productCode(p.id),
        `"${p.title.replace(/"/g, '""')}"`,
        this.capitalize(p.category?.name),
        this.capitalize(p.condition?.name),
        p.location ? `${p.location.building?.name ?? ''} / ${p.location.shelf ?? ''}` : '',
        p.quantity,
        p.estimated_value ?? '',
        p.barcode ?? '',
        this.formatDate(p.created_at),
      ].join(','),
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'products.csv',
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  openBarcodeScanner() {
    this.showBarcodeScanner.set(true);
  }

  onBarcodeScanned(barcode: string) {
    this.searchQuery.set(barcode);
    this.showBarcodeScanner.set(false);
    this.currentPage.set(1);

    // Check if there's a single matching product by barcode
    const matchingProducts = this.products().filter((p) => p.barcode === barcode);
    if (matchingProducts.length === 1) {
      // Open the product in read-only view
      this.viewProduct(matchingProducts[0]);
    }
  }

  closeBarcodeScanner() {
    this.showBarcodeScanner.set(false);
  }
}
