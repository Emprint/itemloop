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
  permissionDenied = signal(false);

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

      // Check camera permission state using Permissions API
      try {
        const permissionStatus = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        console.log('Camera permission state:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          this.errorMessage.set('BARCODE_SCANNER.PERMISSION_DENIED');
          this.permissionDenied.set(true);
          this.isScanning.set(false);
          return;
        }

        // Listen for permission changes
        permissionStatus.addEventListener('change', () => {
          console.log('Camera permission changed to:', permissionStatus.state);
          if (permissionStatus.state === 'granted' && !this.isScanning()) {
            this.startScanning();
          }
        });
      } catch (permQueryError) {
        // Permissions API not supported or query failed, continue with getUserMedia
        console.log('Permissions query failed, continuing with getUserMedia:', permQueryError);
      }

      // Request camera access
      try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        // Stop the stream immediately - we just wanted to trigger the permission dialog
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        console.log('Camera permission granted');
        this.hasCameraPermission.set(true);
      } catch (permError) {
        console.error('Camera permission denied:', permError);

        const errorName = (permError as Error).name;

        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          this.errorMessage.set('BARCODE_SCANNER.PERMISSION_DENIED');
          this.permissionDenied.set(true);
        } else if (errorName === 'NotFoundError') {
          this.errorMessage.set('BARCODE_SCANNER.NO_CAMERA');
        } else {
          this.errorMessage.set('BARCODE_SCANNER.PERMISSION_REQUIRED');
        }

        this.isScanning.set(false);
        return;
      }

      // Now start the actual scanning
      await this.codeReader.decodeFromVideoDevice(null, video, (result) => {
        if (result) {
          this.onBarcodeDetected(result.getText());
        }
      });
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
    this.closeEvent.emit();
  }

  retryPermission() {
    this.permissionDenied.set(false);
    this.errorMessage.set('');
    this.startScanning();
  }

  ngOnDestroy() {
    if (this.scanTimeout !== null) {
      window.clearTimeout(this.scanTimeout);
    }
    this.stopScanning();
  }
}
