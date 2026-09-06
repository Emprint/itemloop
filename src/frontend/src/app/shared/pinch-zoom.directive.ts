import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 12;

/**
 * Pinch-to-zoom, drag-to-pan and double-tap-to-zoom on the host element.
 *
 * index.html sets `user-scalable=no`, which disables the browser's own pinch
 * zoom across the app (it keeps iOS from zooming into form fields). This
 * directive restores the gesture where it is actually wanted — the image
 * viewer — without relaxing the app-wide viewport.
 *
 * Bind it to a value that changes when the content changes, so the transform
 * resets: `<img [appPinchZoom]="currentIndex()">`.
 */
@Directive({
  selector: '[appPinchZoom]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(dragstart)': '$event.preventDefault()',
    style: 'touch-action: none; user-select: none; will-change: transform;',
  },
})
export class PinchZoomDirective implements OnChanges, OnDestroy {
  /** Change this value to reset the zoom (e.g. the displayed image index). */
  @Input('appPinchZoom') resetKey: unknown;

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly pointers = new Map<number, { x: number; y: number }>();

  private scale = 1;
  private tx = 0;
  private ty = 0;

  // Gesture start snapshot
  private startDistance = 0;
  private startScale = 1;
  private startTx = 0;
  private startTy = 0;
  private lastPan = { x: 0, y: 0 };

  private lastTapAt = 0;
  private lastTapPos = { x: 0, y: 0 };

  ngOnChanges(): void {
    this.reset();
  }

  ngOnDestroy(): void {
    this.pointers.clear();
  }

  protected onPointerDown(event: PointerEvent): void {
    this.host.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      this.startDistance = this.distance();
      this.startScale = this.scale;
      this.startTx = this.tx;
      this.startTy = this.ty;
    } else if (this.pointers.size === 1) {
      this.lastPan = { x: event.clientX, y: event.clientY };
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      const distance = this.distance();
      if (this.startDistance > 0) {
        this.scale = this.clampScale((this.startScale * distance) / this.startDistance);
        // Keep the pinch centre anchored rather than zooming on the element centre.
        const ratio = this.scale / this.startScale;
        this.tx = this.startTx * ratio;
        this.ty = this.startTy * ratio;
      }
      this.apply();
      return;
    }

    if (this.scale > 1) {
      // Panning only makes sense once the image overflows its frame.
      this.tx += event.clientX - this.lastPan.x;
      this.ty += event.clientY - this.lastPan.y;
      this.lastPan = { x: event.clientX, y: event.clientY };
      this.apply();
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);

    if (this.pointers.size === 0) {
      this.handleDoubleTap(event);
      if (this.scale <= 1) this.reset();
    } else if (this.pointers.size === 1) {
      const [remaining] = [...this.pointers.values()];
      this.lastPan = { x: remaining.x, y: remaining.y };
    }
  }

  private handleDoubleTap(event: PointerEvent): void {
    const now = Date.now();
    const movedFar =
      Math.hypot(event.clientX - this.lastTapPos.x, event.clientY - this.lastTapPos.y) >
      TAP_SLOP_PX;

    if (now - this.lastTapAt < DOUBLE_TAP_MS && !movedFar) {
      if (this.scale > 1) {
        this.reset();
      } else {
        this.scale = DOUBLE_TAP_SCALE;
        this.apply();
      }
      this.lastTapAt = 0;
      return;
    }

    this.lastTapAt = now;
    this.lastTapPos = { x: event.clientX, y: event.clientY };
  }

  private distance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private clampScale(value: number): number {
    return Math.min(MAX_SCALE, Math.max(1, value));
  }

  private reset(): void {
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.apply();
  }

  private apply(): void {
    // Never let the image be dragged away from its frame.
    const rect = this.host.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * this.scale - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * this.scale - rect.height) / 2);
    this.tx = Math.min(maxX, Math.max(-maxX, this.tx));
    this.ty = Math.min(maxY, Math.max(-maxY, this.ty));

    this.host.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    this.host.style.cursor = this.scale > 1 ? 'grab' : 'zoom-in';
  }
}
