import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { ProductService, Product } from '../product.service';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [ProductFormComponent, TranslateModule, FormsModule],
  templateUrl: './products-list.html',
  styleUrl: './products-list.scss',
})
export class ProductsList {
  private auth = inject(AuthService);
  private service = inject(ProductService);

  products = signal<Product[]>([]);
  errorMessage: string | null = null;
  showForm = signal(false);
  selectedProduct: Product | null = null;
  isReadOnlyForm = false;
  isEditorOrAdmin = false;

  searchQuery = signal('');
  selectedCondition = signal('');
  selectedLocation = signal('');
  selectedCategory = signal('');
  viewMode = signal<'list' | 'grid'>('list');
  pageSize = signal(10);
  currentPage = signal(1);
  openActionId = signal<number | null>(null);

  conditionOptions = computed(() =>
    [...new Set(this.products().map(p => p.condition?.name).filter(Boolean))].sort() as string[]
  );
  locationOptions = computed(() =>
    [...new Set(this.products().map(p => p.location?.building?.name).filter(Boolean))].sort() as string[]
  );
  categoryOptions = computed(() =>
    [...new Set(this.products().map(p => p.category?.name).filter(Boolean))].sort() as string[]
  );

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const cond = this.selectedCondition();
    const loc = this.selectedLocation();
    const cat = this.selectedCategory();
    return this.products().filter(p => {
      if (q && !p.title.toLowerCase().includes(q) &&
          !(p.description ?? '').toLowerCase().includes(q) &&
          !this.productCode(p.id).toLowerCase().includes(q)) return false;
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
    const user = this.auth.user();
    this.isEditorOrAdmin = !!user && (user.role === UserRole.Admin || user.role === UserRole.Editor);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.actions-menu')) {
      this.openActionId.set(null);
    }
  }

  loadProducts() {
    this.service.getProducts().subscribe({
      next: (products) => { this.products.set(products); this.errorMessage = null; },
      error: () => { this.errorMessage = 'Failed to load products'; },
    });
  }

  showAddProductForm() { this.selectedProduct = null; this.isReadOnlyForm = false; this.showForm.set(true); }

  viewProduct(product: Product) {
    this.selectedProduct = product;
    this.isReadOnlyForm = true;
    this.openActionId.set(null);
    this.showForm.set(true);
  }

  editProduct(product: Product) {
    this.selectedProduct = product;
    this.isReadOnlyForm = false;
    this.openActionId.set(null);
    this.showForm.set(true);
  }

  deleteProduct(product: Product) {
    if (!confirm(`Delete "${product.title}"?`)) return;
    this.openActionId.set(null);
    this.service.deleteProduct(product.id).subscribe({
      next: () => this.loadProducts(),
      error: () => { this.errorMessage = 'Failed to delete product'; },
    });
  }

  onSaveProduct(product: Product) {
    const save$ = this.selectedProduct
      ? this.service.updateProduct(this.selectedProduct.id, product)
      : this.service.addProduct(product);
    save$.subscribe({
      next: () => this.completeProductSave(),
      error: () => { this.errorMessage = 'Failed to save product'; },
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
      },
      error: () => { this.errorMessage = 'Failed to save product'; },
    });
  }

  onCancelProduct() { this.showForm.set(false); this.selectedProduct = null; }

  private completeProductSave() {
    this.loadProducts();
    this.showForm.set(false);
    this.selectedProduct = null;
    this.errorMessage = null;
  }

  productCode(id: number) { return `PRD-${String(id).padStart(6, '0')}`; }

  capitalize(s?: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  locationDisplay(p: Product) {
    const b = p.location?.building?.name ?? '';
    const z = p.location?.zone?.name ?? '';
    const s = p.location?.shelf ?? '';
    return { top: b, bottom: [z, s].filter(Boolean).join(' / ') };
  }

  conditionClass(name?: string) {
    const n = name?.toLowerCase() ?? '';
    if (['excellent', 'parfait', 'neuf', 'mint'].some(k => n.includes(k))) return 'badge-excellent';
    if (['good', 'bon', 'gut', 'bueno'].some(k => n.includes(k))) return 'badge-good';
    if (['fair', 'abi', 'use', 'usé', 'average', 'moyen'].some(k => n.includes(k))) return 'badge-fair';
    if (['poor', 'mauvais', 'bad', 'broken', 'cassé'].some(k => n.includes(k))) return 'badge-poor';
    return 'badge-default';
  }

  formatDate(d?: string) { return d ? d.substring(0, 10) : '—'; }

  formatValue(v?: number | null) { return v != null ? `€${v.toFixed(2)}` : '—'; }

  clampedPageRange() {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalProducts());
    return { start, end };
  }

  toggleAction(id: number, e: MouseEvent) {
    e.stopPropagation();
    this.openActionId.set(this.openActionId() === id ? null : id);
  }

  setPage(p: number | '...') {
    if (typeof p !== 'number') return;
    this.currentPage.set(p);
  }

  onSearch(v: string) { this.searchQuery.set(v); this.currentPage.set(1); }
  onFilterChange() { this.currentPage.set(1); }
  onPageSizeChange(v: number) { this.pageSize.set(v); this.currentPage.set(1); }

  exportCsv() {
    const headers = ['Code', 'Title', 'Category', 'Condition', 'Location', 'Quantity', 'Est. Value', 'Barcode', 'Date Added'];
    const lines = this.filteredProducts().map(p => [
      this.productCode(p.id),
      `"${p.title.replace(/"/g, '""')}"`,
      this.capitalize(p.category?.name),
      this.capitalize(p.condition?.name),
      p.location ? `${p.location.building?.name ?? ''} / ${p.location.shelf ?? ''}` : '',
      p.quantity,
      p.estimated_value ?? '',
      p.barcode ?? '',
      this.formatDate(p.created_at),
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'products.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
