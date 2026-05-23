import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { ProductCategoryService } from '../../products/product-category.service';
import { ProductConditionService } from '../../products/product-condition.service';
import { ProductColorService } from '../../products/product-color.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { DropdownService } from '../../shared/dropdown.service';
import { ListShellComponent } from '../../shared/list-shell/list-shell.component';

export interface AttributeItem {
  id: number;
  name: string;
  product_count: number;
}

type ActiveTab = 'categories' | 'conditions' | 'colors';
type AttributeType = 'category' | 'condition' | 'color';

interface EditState {
  id: number | null;
  name: string;
}

interface DeleteState {
  item: AttributeItem;
  type: AttributeType;
  siblings: AttributeItem[];
}

@Component({
  selector: 'app-attributes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ConfirmModal,
    ListShellComponent,
  ],
  templateUrl: './attributes.component.html',
  styleUrl: './attributes.component.scss',
})
export class AttributesComponent {
  private authService = inject(AuthService);
  private categoryService = inject(ProductCategoryService);
  private conditionService = inject(ProductConditionService);
  private colorService = inject(ProductColorService);
  private dropdown = inject(DropdownService);
  private translate = inject(TranslateService);

  readonly activeTab = signal<ActiveTab>('categories');
  readonly categories = signal<AttributeItem[]>([]);
  readonly conditions = signal<AttributeItem[]>([]);
  readonly colors = signal<AttributeItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly editState = signal<EditState | null>(null);
  readonly formName = signal('');
  readonly deleteState = signal<DeleteState | null>(null);
  readonly replacementId = signal<number | null>(null);

  readonly isAdmin = computed(() => this.authService.user()?.role === UserRole.Admin);
  readonly showForm = computed(() => this.editState() !== null);
  readonly showAddForm = computed(() => this.editState() !== null && this.editState()!.id === null);
  readonly activeItems = computed(() => this.getItemsForTab(this.activeTab()));
  readonly addLabel = computed(() => {
    switch (this.activeTab()) {
      case 'conditions':
        return 'ATTRIBUTES.ADD_CONDITION';
      case 'colors':
        return 'ATTRIBUTES.ADD_COLOR';
      default:
        return 'ATTRIBUTES.ADD_CATEGORY';
    }
  });
  readonly countLabel = computed(() => {
    switch (this.activeTab()) {
      case 'conditions':
        return 'ATTRIBUTES.CONDITIONS';
      case 'colors':
        return 'ATTRIBUTES.COLORS';
      default:
        return 'ATTRIBUTES.CATEGORIES';
    }
  });
  readonly formTitle = computed(() =>
    this.editState()?.id ? 'ATTRIBUTES.SAVE_TITLE' : 'ATTRIBUTES.NEW_TITLE',
  );
  readonly showDeleteModal = computed(() => {
    const state = this.deleteState();
    return !!state && state.item.product_count === 0;
  });
  readonly showReassignModal = computed(() => {
    const state = this.deleteState();
    return !!state && state.item.product_count > 0;
  });
  readonly deleteMessage = computed(() => {
    const state = this.deleteState();
    if (!state) {
      return '';
    }

    return this.translate.instant('ATTRIBUTES.DELETE_MODAL.CONFIRM', {
      name: state.item.name,
    });
  });
  readonly reassignMessage = computed(() => {
    const state = this.deleteState();
    if (!state) {
      return '';
    }

    return this.translate.instant('ATTRIBUTES.DELETE_MODAL.IN_USE', {
      count: state.item.product_count,
      name: state.item.name,
    });
  });
  readonly reassignSiblings = computed(() => this.deleteState()?.siblings ?? []);

  readonly searchFn = (item: AttributeItem, query: string) =>
    item.name.toLowerCase().includes(query.toLowerCase().trim());

  constructor() {
    this.loadAll();
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.cancelForm();
    this.cancelDelete();
    this.actionError.set(null);
  }

  showNewForm(): void {
    this.actionError.set(null);
    this.editState.set({ id: null, name: '' });
    this.formName.set('');
  }

  startEdit(item: AttributeItem): void {
    this.actionError.set(null);
    this.editState.set({ id: item.id, name: item.name });
    this.formName.set(item.name);
  }

  cancelForm(): void {
    this.editState.set(null);
    this.formName.set('');
  }

  saveForm(): void {
    const state = this.editState();
    const name = this.formName().trim();
    if (!state || !name || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);

    const type = this.getTypeForTab(this.activeTab());
    const request =
      state.id === null ? this.createItem(type, name) : this.updateItem(type, state.id, name);

    request.subscribe({
      next: (item) => {
        const normalized = this.normalizeItem(
          item,
          state.id === null ? 0 : (this.findItem(type, state.id)?.product_count ?? 0),
        );
        this.upsertItem(type, normalized);
        this.cancelForm();
        this.saving.set(false);
      },
      error: () => {
        this.actionError.set('ERRORS.SERVER_UNAVAILABLE');
        this.saving.set(false);
      },
    });
  }

  openDropdown(item: AttributeItem, event: MouseEvent): void {
    this.dropdown.open(
      [
        {
          label: this.translate.instant('ATTRIBUTES.EDIT'),
          action: () => this.startEdit(item),
        },
        {
          label: this.translate.instant('DELETE'),
          danger: true,
          action: () => this.requestDelete(item),
        },
      ],
      event,
    );
  }

  requestDelete(item: AttributeItem): void {
    const type = this.getTypeForTab(this.activeTab());
    this.actionError.set(null);
    this.deleteState.set({
      item,
      type,
      siblings: this.getItemsForType(type).filter((sibling) => sibling.id !== item.id),
    });
    this.replacementId.set(null);
  }

  cancelDelete(): void {
    this.deleteState.set(null);
    this.replacementId.set(null);
  }

  confirmDelete(): void {
    const state = this.deleteState();
    if (!state || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);

    const replacementId = state.item.product_count > 0 ? this.replacementId() : null;
    this.deleteItem(state.type, state.item.id, replacementId ?? undefined).subscribe({
      next: () => {
        if (replacementId !== null) {
          this.reloadList(state.type);
        } else {
          this.removeItem(state.type, state.item.id);
        }
        this.cancelDelete();
        this.saving.set(false);
      },
      error: () => {
        this.actionError.set('ERRORS.SERVER_UNAVAILABLE');
        this.saving.set(false);
      },
    });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      categories: this.categoryService.getCategories(),
      conditions: this.conditionService.getConditions(),
      colors: this.colorService.getColors(),
    }).subscribe({
      next: ({ categories, conditions, colors }) => {
        this.categories.set(this.normalizeItems(categories));
        this.conditions.set(this.normalizeItems(conditions));
        this.colors.set(this.normalizeItems(colors));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('ATTRIBUTES.LOAD_ERROR');
        this.loading.set(false);
      },
    });
  }

  private reloadList(type: AttributeType): void {
    const request =
      type === 'category'
        ? this.categoryService.getCategories()
        : type === 'condition'
          ? this.conditionService.getConditions()
          : this.colorService.getColors();

    request.subscribe({
      next: (items) => this.setItemsForType(type, this.normalizeItems(items)),
      error: () => {
        this.actionError.set('ATTRIBUTES.LOAD_ERROR');
      },
    });
  }

  private createItem(type: AttributeType, name: string) {
    if (type === 'category') {
      return this.categoryService.addCategory(name);
    }
    if (type === 'condition') {
      return this.conditionService.addCondition(name);
    }
    return this.colorService.addColor(name);
  }

  private updateItem(type: AttributeType, id: number, name: string) {
    if (type === 'category') {
      return this.categoryService.updateCategory(id, name);
    }
    if (type === 'condition') {
      return this.conditionService.updateCondition(id, name);
    }
    return this.colorService.updateColor(id, name);
  }

  private deleteItem(type: AttributeType, id: number, replacementId?: number) {
    if (type === 'category') {
      return this.categoryService.deleteCategory(id, replacementId);
    }
    if (type === 'condition') {
      return this.conditionService.deleteCondition(id, replacementId);
    }
    return this.colorService.deleteColor(id, replacementId);
  }

  private getItemsForTab(tab: ActiveTab): AttributeItem[] {
    if (tab === 'conditions') {
      return this.conditions();
    }
    if (tab === 'colors') {
      return this.colors();
    }
    return this.categories();
  }

  private getTypeForTab(tab: ActiveTab): AttributeType {
    if (tab === 'conditions') {
      return 'condition';
    }
    if (tab === 'colors') {
      return 'color';
    }
    return 'category';
  }

  private getItemsForType(type: AttributeType): AttributeItem[] {
    if (type === 'condition') {
      return this.conditions();
    }
    if (type === 'color') {
      return this.colors();
    }
    return this.categories();
  }

  private setItemsForType(type: AttributeType, items: AttributeItem[]): void {
    if (type === 'condition') {
      this.conditions.set(items);
      return;
    }
    if (type === 'color') {
      this.colors.set(items);
      return;
    }
    this.categories.set(items);
  }

  private findItem(type: AttributeType, id: number): AttributeItem | undefined {
    return this.getItemsForType(type).find((item) => item.id === id);
  }

  private upsertItem(type: AttributeType, item: AttributeItem): void {
    const items = this.getItemsForType(type);
    const existingIndex = items.findIndex((entry) => entry.id === item.id);
    const nextItems = [...items];

    if (existingIndex === -1) {
      nextItems.push(item);
    } else {
      nextItems[existingIndex] = item;
    }

    this.setItemsForType(type, this.sortItems(nextItems));
  }

  private removeItem(type: AttributeType, id: number): void {
    this.setItemsForType(
      type,
      this.getItemsForType(type).filter((item) => item.id !== id),
    );
  }

  private normalizeItems(
    items: { id: number; name: string; product_count?: number }[],
  ): AttributeItem[] {
    return this.sortItems(items.map((item) => this.normalizeItem(item)));
  }

  private normalizeItem(
    item: { id: number; name: string; product_count?: number },
    fallbackCount = 0,
  ): AttributeItem {
    return {
      id: item.id,
      name: item.name,
      product_count: Number(item.product_count ?? fallbackCount),
    };
  }

  private sortItems(items: AttributeItem[]): AttributeItem[] {
    return [...items].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }
}
