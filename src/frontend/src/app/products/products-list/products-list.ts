import { Component, signal, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { ProductService, Product } from '../product.service';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [ProductFormComponent],
  templateUrl: './products-list.html',
})
export class ProductsList {
  products = signal<Product[]>([]);
  errorMessage: string | null = null;
  showForm = false;
  selectedProduct: Product | null = null;
  isEditorOrAdmin = false;
  private auth = inject(AuthService);

  private service = inject(ProductService);

  constructor() {
    this.loadProducts();
    const user = this.auth.user();
    this.isEditorOrAdmin =
      !!user && (user.role === UserRole.Admin || user.role === UserRole.Editor);
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
    this.showForm = true;
  }

  editProduct(product: Product) {
    this.selectedProduct = product;
    this.showForm = true;
  }

  onSaveProduct(product: Product) {
    if (this.selectedProduct) {
      this.service.updateProduct(this.selectedProduct.id, product).subscribe({
        next: () => {
          this.loadProducts();
          this.showForm = false;
        },
        error: () => {
          this.errorMessage = 'Failed to update product';
        },
      });
    } else {
      this.service.addProduct(product).subscribe({
        next: () => {
          this.loadProducts();
          this.showForm = false;
        },
        error: () => {
          this.errorMessage = 'Failed to add product';
        },
      });
    }
  }

  onCancelProduct() {
    this.showForm = false;
    this.selectedProduct = null;
  }
}
