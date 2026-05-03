import {
  Component,
  signal,
  output,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BrowserMultiFormatReader } from '@zxing/library';

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.scss'],
})
export class BarcodeScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  scanComplete = output<string>();
  closeEvent = output<void>();

  isScanning = signal(false);
  errorMessage = signal('');
  hasCameraPermission = signal(false);

  private codeReader = new BrowserMultiFormatReader();
  private scanTimeout: number | null = null;

  ngAfterViewInit() {
    // Use a longer delay to ensure the video element is rendered
    this.scanTimeout = window.setTimeout(() => {
      this.startScanning();
    }, 300);
  }

  async startScanning() {
    try {
      this.isScanning.set(true);
      this.errorMessage.set('');

      const video = this.videoElement?.nativeElement;
      if (!video) {
        console.error('Video element not found');
        this.errorMessage.set('BARCODE_SCANNER.CAMERA_ERROR');
        this.isScanning.set(false);
        return;
      }

      await this.codeReader.decodeFromVideoDevice(null, video, (result) => {
        if (result) {
          this.onBarcodeDetected(result.getText());
        }
      });

      this.hasCameraPermission.set(true);
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.errorMessage.set('BARCODE_SCANNER.CAMERA_ERROR');
      this.isScanning.set(false);
    }
  }

  onBarcodeDetected(barcode: string) {
    this.scanComplete.emit(barcode);
    this.stopScanning();
  }

  stopScanning() {
    try {
      this.codeReader.reset();
      this.isScanning.set(false);
    } catch (error) {
      console.error('Error stopping barcode scanner:', error);
    }
  }

  onClose() {
    this.stopScanning();
    this.close.emit();
  }

  ngOnDestroy() {
    if (this.scanTimeout !== null) {
      window.clearTimeout(this.scanTimeout);
    }
    this.stopScanning();
  }
}
