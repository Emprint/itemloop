import { Injectable, signal } from '@angular/core';

export interface DropdownItem {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

const DROPDOWN_WIDTH = 130;
const ITEM_HEIGHT = 36;
const MARGIN = 8;

@Injectable({ providedIn: 'root' })
export class DropdownService {
  items = signal<DropdownItem[]>([]);
  pos = signal<{ top: number; left: number } | null>(null);

  open(items: DropdownItem[], e: MouseEvent) {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    const dropdownHeight = items.length * ITEM_HEIGHT + MARGIN;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4;

    // Right-align with the button, clamped to viewport
    let left = rect.right - DROPDOWN_WIDTH;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - DROPDOWN_WIDTH - MARGIN));

    this.items.set(items);
    this.pos.set({ top, left });
  }

  close() {
    this.pos.set(null);
    this.items.set([]);
  }

  execute(item: DropdownItem) {
    this.close();
    item.action();
  }
}
