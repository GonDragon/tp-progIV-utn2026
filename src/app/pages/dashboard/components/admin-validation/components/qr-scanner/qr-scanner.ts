import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  signal,
  input
} from '@angular/core';

declare const BarcodeDetector: any;

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.css'
})
export class QrScanner implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  disabled = input<boolean>(false);

  @Output() scan = new EventEmitter<string>();
  @Output() cameraActiveChange = new EventEmitter<boolean>();

  mediaStream: MediaStream | null = null;
  animationFrameId: number | null = null;
  barcodeDetector: any = null;

  isCameraRunning = signal<boolean>(false);
  hasCameraSupport = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  availableCameras = signal<MediaDeviceInfo[]>([]);
  selectedCameraId = signal<string>('');
  isDetectingSupported = signal<boolean>(false);
  isProcessingScan = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const supportedFormats = await (BarcodeDetector as any).getSupportedFormats();
        if (supportedFormats.includes('qr_code')) {
          this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          this.isDetectingSupported.set(true);
        } else {
          this.barcodeDetector = new BarcodeDetector();
          this.isDetectingSupported.set(true);
        }
      } catch {
        try {
          this.barcodeDetector = new BarcodeDetector();
          this.isDetectingSupported.set(true);
        } catch {
          this.isDetectingSupported.set(false);
        }
      }
    } else {
      this.isDetectingSupported.set(false);
    }

    await this.loadAvailableDevices();
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async loadAvailableDevices(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      this.hasCameraSupport.set(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      this.availableCameras.set(videoDevices);
      if (videoDevices.length > 0 && !this.selectedCameraId()) {
        // Prefer back / environment camera if labeled
        const backCam = videoDevices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('environment')
        );
        this.selectedCameraId.set(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Error al enumerar dispositivos de cámara:', err);
    }
  }

  async startCamera(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.hasCameraSupport.set(false);
      this.errorMessage.set('Tu navegador no soporta acceso a la cámara.');
      return;
    }

    this.stopCamera();
    this.errorMessage.set(null);

    const videoConstraints: MediaTrackConstraints = this.selectedCameraId()
      ? { deviceId: { exact: this.selectedCameraId() } }
      : { facingMode: { ideal: 'environment' } };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      this.mediaStream = stream;
      this.isCameraRunning.set(true);
      this.cameraActiveChange.emit(true);

      // Refresh devices with proper labels once permission is granted
      await this.loadAvailableDevices();

      if (this.videoRef?.nativeElement) {
        const video = this.videoRef.nativeElement;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        this.startDetectionLoop();
      }
    } catch (err: any) {
      console.error('Error al iniciar la cámara:', err);
      this.isCameraRunning.set(false);
      this.cameraActiveChange.emit(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.errorMessage.set('Permiso de cámara denegado. Permite el acceso para escanear boletos.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.errorMessage.set('No se encontró ninguna cámara en este dispositivo.');
      } else {
        this.errorMessage.set('No fue posible acceder a la cámara: ' + (err.message || 'Error desconocido'));
      }
    }
  }

  stopCamera(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }

    this.isCameraRunning.set(false);
    this.cameraActiveChange.emit(false);
  }

  async onCameraSelect(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    this.selectedCameraId.set(target.value);
    await this.startCamera();
  }

  startDetectionLoop(): void {
    if (!this.barcodeDetector) {
      return;
    }

    const checkFrame = async () => {
      if (!this.isCameraRunning() || this.disabled() || this.isProcessingScan()) {
        this.animationFrameId = requestAnimationFrame(checkFrame);
        return;
      }

      const video = this.videoRef?.nativeElement;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const barcodes = await this.barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue.trim()) {
              this.handleSuccessfulScan(rawValue.trim());
              return;
            }
          }
        } catch {
          // Frame detection error, continue loop
        }
      }

      this.animationFrameId = requestAnimationFrame(checkFrame);
    };

    this.animationFrameId = requestAnimationFrame(checkFrame);
  }

  handleSuccessfulScan(code: string): void {
    if (this.isProcessingScan()) return;

    this.isProcessingScan.set(true);
    this.scan.emit(code);

    // Debounce processing to avoid duplicate rapid emits
    setTimeout(() => {
      this.isProcessingScan.set(false);
      if (this.isCameraRunning()) {
        this.startDetectionLoop();
      }
    }, 1500);
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const bitmap = await createImageBitmap(file);
      if (this.barcodeDetector) {
        const barcodes = await this.barcodeDetector.detect(bitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          this.handleSuccessfulScan(barcodes[0].rawValue.trim());
          return;
        }
      }

      this.errorMessage.set('No se detectó ningún código QR en la imagen seleccionada.');
    } catch (err: any) {
      this.errorMessage.set('Error al procesar la imagen: ' + (err.message || 'Error desconocido'));
    } finally {
      input.value = '';
    }
  }
}
