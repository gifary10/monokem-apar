import { showAlert } from './ui-manager.js';

export class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.onSuccessCallback = null;
    this.currentQrReaderElement = null;
  }

  async startScanner(qrReaderElement, onSuccess) {
    try {
      if (!qrReaderElement) {
        throw new Error('QR Reader element not found');
      }
      
      // Hentikan scanner yang sedang berjalan jika ada
      if (this.isScanning) {
        await this.stopScanner();
      }
      
      // Simpan elemen dan callback
      this.currentQrReaderElement = qrReaderElement;
      this.onSuccessCallback = onSuccess;
      
      qrReaderElement.style.display = 'block';
      
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('HTML5 QR Code library not loaded');
      }
      
      this.html5QrCode = new Html5Qrcode(qrReaderElement.id);
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_QR_CODE,
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ]
      };
      
      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (qrCodeMessage) => {
          console.log('QR Code detected:', qrCodeMessage);
          if (this.onSuccessCallback) {
            this.onSuccessCallback(qrCodeMessage.trim());
          }
        },
        (errorMessage) => {
          // Ignore decoding errors, just continue scanning
        }
      ).catch(error => {
        console.error('Scanner start failed:', error);
        throw error;
      });
      
      this.isScanning = true;
      console.log('Scanner started successfully');
      return true;
    } catch (error) {
      console.error('Error starting scanner with back camera:', error);
      
      // Fallback ke kamera depan
      try {
        if (this.html5QrCode) {
          await this.html5QrCode.start(
            { facingMode: "user" },
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              supportedScanTypes: [
                Html5QrcodeScanType.SCAN_TYPE_QR_CODE,
                Html5QrcodeScanType.SCAN_TYPE_CAMERA
              ]
            },
            (qrCodeMessage) => {
              console.log('QR Code detected (front camera):', qrCodeMessage);
              if (this.onSuccessCallback) {
                this.onSuccessCallback(qrCodeMessage.trim());
              }
            },
            (errorMessage) => {
              // Ignore decoding errors
            }
          );
          
          this.isScanning = true;
          console.log('Scanner started with front camera');
          return true;
        }
      } catch (fallbackError) {
        console.error('Fallback camera also failed:', fallbackError);
        this.cleanup();
      }
      
      showAlert('Gagal membuka kamera. Pastikan Anda memberikan izin akses kamera.', 'danger');
      return false;
    }
  }

  async stopScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        console.log('Stopping scanner...');
        await this.html5QrCode.stop();
        console.log('Scanner stopped successfully');
        this.cleanup();
        return true;
      } catch (error) {
        console.error('Error stopping scanner:', error);
        // Force cleanup even if stop fails
        this.cleanup();
        return false;
      }
    }
    return true; // Return true jika tidak ada scanner aktif
  }

  // Method cleanup yang lebih baik
  cleanup() {
    this.isScanning = false;
    this.onSuccessCallback = null;
    
    if (this.currentQrReaderElement) {
      this.currentQrReaderElement.style.display = 'none';
      // Clear any existing video elements
      const videoElement = this.currentQrReaderElement.querySelector('video');
      if (videoElement) {
        videoElement.remove();
      }
    }
    
    // Clear html5QrCode reference
    this.html5QrCode = null;
  }

  isScannerActive() {
    return this.isScanning && this.html5QrCode !== null;
  }

  // Method untuk restart scanner
  async restartScanner(qrReaderElement, onSuccess) {
    console.log('Restarting scanner...');
    await this.stopScanner();
    // Beri waktu untuk cleanup sebelum restart
    await new Promise(resolve => setTimeout(resolve, 500));
    return await this.startScanner(qrReaderElement, onSuccess);
  }
}
