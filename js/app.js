import { CONFIG } from './config.js';
import { QRScanner } from './scanner.js';
import { DataService } from './data-service.js';
import { InspectionService } from './inspection-service.js';
import { UIManager, showAlert } from './ui-manager.js';
import { ErrorHandler } from './error-handler.js';

class APARScannerApp {
  constructor() {
    this.scanner = new QRScanner();
    this.dataService = new DataService();
    this.inspectionService = new InspectionService();
    this.uiManager = new UIManager();
    
    // Setup global error handling
    ErrorHandler.setupGlobalErrorHandling();
    
    // Set dependencies
    this.uiManager.setDataService(this.dataService);
    this.dataService.setUIManager(this.uiManager);
    this.inspectionService.setDataService(this.dataService);
    
    this.initializeApp();
  }

  initializeApp() {
    this.setDefaultDate();
    this.setupEventListeners();
    this.setupInspectorDropdown();
    this.setupBottomNavigation();
    this.loadInitialData();
    this.checkCameraPermissions();
    this.updateStats();
  }

  setDefaultDate() {
    try {
      // Set tanggal pemeriksaan ke tanggal hari ini dalam format DD/MM/YYYY
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const todayFormatted = `${day}/${month}/${year}`;
      
      if (this.uiManager.elements.inspectionDate) {
        // Untuk input date, tetap gunakan format YYYY-MM-DD
        this.uiManager.elements.inspectionDate.value = today.toISOString().split('T')[0];
      }
      
      // Set tanggal expired ke 1 tahun dari sekarang dalam format DD/MM/YYYY
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() + 1);
      const expiredDay = String(expiredDate.getDate()).padStart(2, '0');
      const expiredMonth = String(expiredDate.getMonth() + 1).padStart(2, '0');
      const expiredYear = expiredDate.getFullYear();
      const expiredFormatted = `${expiredDay}/${expiredMonth}/${expiredYear}`;
      
      const expiredDateInput = document.getElementById('expiredDate');
      if (expiredDateInput) {
        // Untuk input date, tetap gunakan format YYYY-MM-DD
        expiredDateInput.value = expiredDate.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error setting default date:', error);
    }
  }

  setupBottomNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        
        navItems.forEach(navItem => navItem.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.section').forEach(section => {
          section.classList.remove('active');
        });
        
        const targetSection = item.getAttribute('data-section');
        const sectionElement = document.getElementById(targetSection);
        if (sectionElement) {
          sectionElement.classList.add('active');
        }
        
        if (targetSection === 'data-section') {
          // Tampilkan loading saat berpindah ke tab data
          this.uiManager.showDataLoading();
          setTimeout(() => {
            this.refreshTable();
            this.uiManager.hideDataLoading();
          }, 100);
        } else if (targetSection === 'history-section') {
          this.loadAllInspectionHistory();
        }
      });
    });
  }

  setupInspectorDropdown() {
    const inspectorDropdown = document.getElementById('inspectorName');
    if (inspectorDropdown) {
      inspectorDropdown.addEventListener('change', (e) => this.handleInspectorChange(e));
    }
  }

  async checkCameraPermissions() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API not supported in this browser');
      showAlert('Browser tidak mendukung akses kamera. Gunakan browser modern seperti Chrome, Firefox, atau Edge.', 'warning');
      return false;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('Camera permissions are granted');
      return true;
    } catch (error) {
      console.warn('Camera permissions denied or not available:', error);
      showAlert('Izin akses kamera diperlukan untuk scanning QR Code. Pastikan Anda memberikan izin akses kamera.', 'warning');
      return false;
    }
  }

  setupEventListeners() {
    const { elements } = this.uiManager;

    if (elements.startScan) {
      elements.startScan.addEventListener('click', () => this.startScanner());
    }
    
    if (elements.stopScan) {
      elements.stopScan.addEventListener('click', () => this.stopScanner());
    }
    
    if (elements.inspectionForm) {
      elements.inspectionForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Event listener untuk retry button
    if (elements.retryLoadData) {
      elements.retryLoadData.addEventListener('click', () => this.loadInitialData());
    }

    // PERBAIKAN: Event listener yang lebih baik untuk modal
    if (elements.inspectionModal) {
      // Handle ketika modal ditutup
      elements.inspectionModal.addEventListener('hidden.bs.modal', () => {
        console.log('Modal inspection ditutup');
        this.uiManager.resetForm();
        this.hideOtherInspectorField();
        
        // Restart scanner setelah modal benar-benar tertutup
        setTimeout(() => {
          this.restartScannerAfterForm();
        }, 500);
      });

      // Handle ketika modal dibuka
      elements.inspectionModal.addEventListener('show.bs.modal', () => {
        console.log('Modal inspection dibuka');
        this.setDefaultDate();
        this.hideOtherInspectorField();
      });

      // Handle ketika modal selesai ditampilkan
      elements.inspectionModal.addEventListener('shown.bs.modal', () => {
        console.log('Modal inspection selesai ditampilkan');
      });
    }
  }

  // Method untuk menangani perubahan dropdown pemeriksa
  handleInspectorChange(e) {
    const selectedValue = e.target.value;
    const otherContainer = document.getElementById('otherInspectorContainer');
    const otherInput = document.getElementById('otherInspector');
    
    if (selectedValue === 'Other') {
      // Tampilkan field input manual
      if (otherContainer) {
        otherContainer.style.display = 'block';
        // Tambahkan animasi slide-in
        otherContainer.classList.add('slide-in');
      }
      if (otherInput) {
        otherInput.required = true;
        otherInput.focus(); // Fokus ke input field
      }
    } else {
      // Sembunyikan field input manual
      this.hideOtherInspectorField();
    }
  }

  // Method untuk menyembunyikan field input manual
  hideOtherInspectorField() {
    const otherContainer = document.getElementById('otherInspectorContainer');
    const otherInput = document.getElementById('otherInspector');
    
    if (otherContainer) {
      otherContainer.style.display = 'none';
      otherContainer.classList.remove('slide-in');
    }
    if (otherInput) {
      otherInput.required = false;
      otherInput.value = ''; // Kosongkan nilai
    }
  }

  async loadInitialData() {
    try {
      this.uiManager.showDataLoading();
      
      await this.dataService.loadAllData();
      console.log('Initial data loaded successfully');
      
      this.updateStats();
      this.refreshTable();
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.uiManager.showDataError('Gagal memuat data APAR: ' + error.message);
    } finally {
      this.uiManager.hideDataLoading();
    }
  }

  updateStats() {
    try {
      const allData = this.dataService.getAllData();
      const totalAparCount = document.getElementById('totalAparCount');
      const goodAparCount = document.getElementById('goodAparCount');
      const needRepairCount = document.getElementById('needRepairCount');
      
      if (totalAparCount) {
        totalAparCount.textContent = allData.length;
      }
      
      let goodCount = 0;
      let needRepair = 0;
      
      allData.forEach(apar => {
        const status = this.inspectionService.getLastInspectionStatus(apar.QRCODE);
        if (status.status === 'Baik') {
          goodCount++;
        } else if (status.status === 'Perlu Perbaikan' || status.status === 'Kadaluarsa') {
          needRepair++;
        }
      });
      
      if (goodAparCount) {
        goodAparCount.textContent = goodCount;
      }
      
      if (needRepairCount) {
        needRepairCount.textContent = needRepair;
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async startScanner() {
    try {
      if (this.uiManager.elements.startScan) {
        this.uiManager.elements.startScan.disabled = true;
        this.uiManager.elements.startScan.innerHTML = '<i class="bi bi-hourglass-split"></i> Membuka Kamera...';
      }
      
      const success = await this.scanner.startScanner(
        this.uiManager.elements.qrReader,
        (qrCode) => this.handleQRScan(qrCode)
      );
      
      if (success) {
        this.uiManager.toggleScannerUI(true);
        showAlert('Scanner berhasil diaktifkan', 'success');
      } else {
        throw new Error('Gagal memulai scanner');
      }
    } catch (error) {
      console.error('Error in startScanner:', error);
      showAlert('Gagal mengakses kamera: ' + error.message, 'danger');
    } finally {
      if (this.uiManager.elements.startScan) {
        this.uiManager.elements.startScan.disabled = false;
        this.uiManager.elements.startScan.innerHTML = '<i class="bi bi-qr-code-scan"></i> Mulai Scan';
      }
    }
  }

  async stopScanner() {
    try {
      const success = await this.scanner.stopScanner();
      if (success) {
        this.uiManager.toggleScannerUI(false);
        showAlert('Scanner dihentikan', 'info');
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
      showAlert('Gagal menghentikan scanner: ' + error.message, 'danger');
    }
  }

  // Method untuk restart scanner setelah form selesai
  async restartScannerAfterForm() {
    try {
      console.log('Restarting scanner after form completion...');
      
      // Pastikan scanner benar-benar berhenti dulu
      await this.scanner.stopScanner();
      
      // Tunggu sebentar sebelum restart
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await this.scanner.startScanner(
        this.uiManager.elements.qrReader,
        (qrCode) => this.handleQRScan(qrCode)
      );
      
      if (success) {
        this.uiManager.toggleScannerUI(true);
        console.log('Scanner restarted successfully after form completion');
      } else {
        console.warn('Scanner failed to restart after form completion');
      }
    } catch (error) {
      console.error('Error restarting scanner after form:', error);
      // Tidak perlu show alert karena ini adalah proses otomatis
    }
  }

  async handleQRScan(qrCode) {
    try {
      console.log('QR Code scanned:', qrCode);
      
      // Stop scanner sementara saat memproses data
      await this.scanner.stopScanner();
      
      // Ambil data APAR dari code1.gs sheet Data
      const data = await this.dataService.fetchAPARData(qrCode);
      
      if (data) {
        this.inspectionService.setCurrentAPARId(qrCode);
        // Simpan data APAR lengkap dari sheet Data
        this.inspectionService.setCurrentAPARData(data);
        this.uiManager.renderTable([data], (aparId) => 
          this.inspectionService.getLastInspectionStatus(aparId)
        );
        this.showInspectionInterface(qrCode);
      } else {
        // Jika data tidak ditemukan, restart scanner
        setTimeout(() => {
          this.restartScannerAfterForm();
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling QR scan:', error);
      showAlert('Terjadi kesalahan saat memproses QR Code', 'danger');
      
      // Restart scanner jika ada error
      setTimeout(() => {
        this.restartScannerAfterForm();
      }, 1000);
    }
  }

  showInspectionInterface(aparId) {
    this.showInspectionModal();
    this.loadInspectionHistory(aparId);
  }

  showInspectionModal() {
    if (!this.uiManager.elements.inspectionModal) {
      console.error('Inspection modal element not found');
      return;
    }
    
    try {
      const inspectionModal = new bootstrap.Modal(this.uiManager.elements.inspectionModal);
      inspectionModal.show();
    } catch (error) {
      console.error('Error showing inspection modal:', error);
      // Fallback: show dengan style langsung
      this.uiManager.elements.inspectionModal.style.display = 'block';
      this.uiManager.elements.inspectionModal.classList.add('show');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    this.uiManager.setFormLoading(true);
    
    try {
      const formData = this.uiManager.getFormData();
      
      // Validasi tambahan untuk nama pemeriksa
      if (!formData.inspector || formData.inspector.trim() === '') {
        throw new Error('Nama pemeriksa harus diisi');
      }
      
      const inspectionData = await this.inspectionService.saveInspection(formData);
      
      const inspectionModal = bootstrap.Modal.getInstance(this.uiManager.elements.inspectionModal);
      if (inspectionModal) {
        inspectionModal.hide();
      }
      
      this.uiManager.resetForm();
      this.hideOtherInspectorField(); // Sembunyikan field manual setelah submit
      this.showSuccessModal();
      
      // Refresh data setelah penyimpanan berhasil
      await this.refreshInspectionHistory();
      
      console.log('Inspection saved successfully:', inspectionData);
      showAlert('✅ Data pemeriksaan berhasil disimpan!', 'success');
      
    } catch (error) {
      console.error('Error saving inspection:', error);
      showAlert(`❌ Gagal menyimpan data: ${error.message}`, 'danger');
    } finally {
      this.uiManager.setFormLoading(false);
    }
  }

  // Method untuk refresh data riwayat pemeriksaan
  async refreshInspectionHistory() {
    try {
      await this.dataService.loadInspectionHistory();
      this.updateStats();
      this.refreshTable();
      
      // Refresh tampilan history section jika sedang aktif
      const historySection = document.getElementById('history-section');
      if (historySection && historySection.classList.contains('active')) {
        this.loadAllInspectionHistory();
      }
    } catch (error) {
      console.error('Error refreshing inspection history:', error);
    }
  }

  refreshTable() {
    try {
      const allData = this.dataService.getAllData();
      this.uiManager.renderTable(allData, (aparId) => 
        this.inspectionService.getLastInspectionStatus(aparId)
      );
    } catch (error) {
      console.error('Error refreshing table:', error);
    }
  }

  loadInspectionHistory(aparId) {
    if (!aparId) {
      console.warn('No APAR ID provided for loading history');
      return;
    }
    
    try {
      this.inspectionService.renderHistoryList(this.uiManager.elements.historyList, aparId);
    } catch (error) {
      console.error('Error loading inspection history:', error);
      showAlert('Gagal memuat riwayat pemeriksaan', 'warning');
    }
  }

  loadAllInspectionHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    try {
      // Ambil semua data riwayat dari server (code1.gs sheet Rekap)
      const serverInspections = this.dataService.getAllInspectionHistory();
      
      // Kelompokkan berdasarkan QR Code
      const groupedInspections = {};
      
      serverInspections.forEach(inspection => {
        const aparId = inspection.QRCODE;
        if (aparId) {
          if (!groupedInspections[aparId]) {
            groupedInspections[aparId] = [];
          }
          
          // Konversi format server ke format yang diharapkan UI
          const convertedInspection = this.inspectionService.convertServerToLocalFormat(inspection);
          if (convertedInspection) {
            groupedInspections[aparId].push(convertedInspection);
          }
        }
      });
      
      // Gunakan method untuk render grouped history
      this.uiManager.renderGroupedHistory(groupedInspections);
      
    } catch (error) {
      console.error('Error loading all inspection history:', error);
      showAlert('Gagal memuat riwayat pemeriksaan lengkap', 'warning');
      
      // Fallback: tampilkan pesan kosong
      historyList.innerHTML = '<p class="text-muted text-center">Tidak ada riwayat pemeriksaan.</p>';
    }
  }

  showSuccessModal() {
    const successModalElement = document.getElementById('successModal');
    if (successModalElement) {
      try {
        const successModal = new bootstrap.Modal(successModalElement);
        successModal.show();
      } catch (error) {
        console.error('Error showing success modal:', error);
      }
    }
  }

  // Method untuk memuat ulang data dari server
  async reloadDataFromServer() {
    try {
      this.uiManager.showDataLoading();
      
      await this.dataService.loadAllData();
      this.refreshTable();
      this.updateStats();
      
      showAlert('Data berhasil diperbarui dari server', 'success');
    } catch (error) {
      console.error('Error reloading data from server:', error);
      showAlert('Gagal memuat data terbaru dari server', 'warning');
    } finally {
      this.uiManager.hideDataLoading();
    }
  }
}

// Function untuk format tanggal dari DD/MM/YYYY ke YYYY-MM-DD (untuk input)
function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  try {
    // Jika sudah format DD/MM/YYYY, konversi ke YYYY-MM-DD untuk input[type=date]
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    
    // Jika format ISO, langsung return
    return dateString.split('T')[0];
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return dateString.split('T')[0] || '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new APARScannerApp();
    console.log('APAR Scanner App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize APAR Scanner App:', error);
    showAlert('Gagal memulai aplikasi. Silakan refresh halaman.', 'danger');
  }
});

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Export untuk testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APARScannerApp };
}