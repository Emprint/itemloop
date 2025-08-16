import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.html',
  styleUrls: ['./confirm-modal.scss'],
})
export class ConfirmModal {
  @Input() message = 'Are you sure you want to delete this item?';
  @Input() show = false;
  @Output() confirmEvent = new EventEmitter<void>();
  @Output() cancelEvent = new EventEmitter<void>();

  onConfirm() {
    this.confirmEvent.emit();
  }

  onCancel() {
    this.cancelEvent.emit();
  }
}
