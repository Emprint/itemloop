import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './combobox.component.html',
  styleUrls: ['./combobox.component.scss'],
})
export class ComboboxComponent implements OnInit {
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const match = this.options.find((opt) => opt.toLowerCase() === this.value.toLowerCase());
      if (match) {
        this.selectOption(match);
      } else if (this.value) {
        this.onAddNew();
      }
      event.preventDefault();
    }
  }
  isValueInOptions(): boolean {
    return (
      !!this.value && this.options.some((opt) => opt.toLowerCase() === this.value.toLowerCase())
    );
  }
  @Input() options: string[] = [];
  @Input() value = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() addNew = new EventEmitter<string>();

  filteredOptions = signal<string[]>([]);
  showDropdown = signal(false);

  ngOnInit(): void {
    this.filteredOptions.set(this.options);
  }

  onInput(event: Event) {
    const input = (event.target as HTMLInputElement).value;
    this.valueChange.emit(input);
    this.filteredOptions.set(
      this.options.filter((opt) => opt.toLowerCase().includes(input.toLowerCase())),
    );
    this.showDropdown.set(true);
  }

  selectOption(option: string) {
    this.valueChange.emit(option);
    this.showDropdown.set(false);
  }

  onBlur() {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  onAddNew() {
    this.addNew.emit(this.value);
    // Set the input to the newly added value
    this.valueChange.emit(this.value);
    this.showDropdown.set(false);
  }
}
