import {
  Component, Input, Output, EventEmitter,
  ContentChild, TemplateRef,
  computed, signal, OnChanges, SimpleChanges,
  ViewEncapsulation, HostListener,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [NgTemplateOutlet, TranslateModule],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ListShellComponent implements OnChanges {
  @Input() title = '';
  @Input() addLabel = '';
  @Input() addable = true;
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Search…';
  @Input() countLabel = '';
  @Input() items: any[] = [];
  @Input() searchFn?: (item: any, query: string) => boolean;

  @Output() addClicked = new EventEmitter<void>();

  @ContentChild('headTpl', { read: TemplateRef }) headTpl?: TemplateRef<void>;
  @ContentChild('rowTpl', { read: TemplateRef }) rowTpl?: TemplateRef<{ $implicit: any }>;

  private itemsSig = signal<any[]>([]);
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(25);

  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const items = this.itemsSig();
    if (!q) return items;
    if (this.searchFn) return items.filter(item => this.searchFn!(item, q));
    return items.filter(item =>
      Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
    );
  });

  paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize()))
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: (number | string)[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= cur - 1 && i <= cur + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  });

  pageRange = computed(() => {
    const count = this.filteredItems().length;
    if (count === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), count);
    return { start, end };
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.itemsSig.set(this.items ?? []);
      this.currentPage.set(1);
    }
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  setPage(p: number | string) {
    const n = +p;
    if (n < 1 || n > this.totalPages()) return;
    this.currentPage.set(n);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }
}
