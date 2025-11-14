import { CONFIG } from './config.js';
import { QRScanner } from './scanner.js';
import { DataService } from './data-service.js';
import { InspectionService } from './inspection-service.js';
import { UIManager, showAlert } from './ui-manager.js';
import { DetailModalManager } from './detail-modal.js';

class APARScannerApp {
  constructor() {
    this.scanner = new QRScanner();
    this.dataService = new DataService();
    this.inspectionService = new InspectionService();
    this.uiManager = new UIManager();
    this.detailModalManager = new DetailModalManager(this.dataService, this.inspectionService);
    
    this.setupServiceConnections();
    this.initializeApp();
  }

  setupServiceConnections() {
    this.inspectionService.setDataService(this.dataService);
    this.uiManager.setDataService(this.dataService);
    this.dataService.setUIManager(this.uiManager);
  }

  initializeApp() {
    this.showLoadingScreen();
    this.setDefaultDate();
    this.setupEventListeners();
    this.setupInspectorDropdown();
    this.setupBottomNavigation();
    this.loadInitialData();
    
    // Handle URL QR Code parameter for detail modal
    this.detailModalManager.handleURLQRCode();
  }

  showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingScreen) loadingScreen.classList.add('active');
    if (mainContent) mainContent.style.display = 'none';
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingScreen) {
      loadingScreen.classList.remove('active');
      loadingScreen.classList.add('hidden');
    }
    if (mainContent) mainContent.style.display = 'block';
  }

  setDefaultDate() {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (this.uiManager.elements.inspectionDate) {
        this.uiManager.elements.inspectionDate.value = today;
      }
      
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() + 1);
      const expiredDateInput = document.getElementById('expiredDate');
      if (expiredDateInput) {
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
        if (sectionElement) sectionElement.classList.add('active');
        
        if (targetSection === 'data-section') {
          this.refreshTable();
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

  handleInspectorChange(e) {
    const selectedValue = e.target.value;
    const otherContainer = document.getElementById('otherInspectorContainer');
    const otherInput = document.getElementById('otherInspector');
    
    if (selectedValue === 'Other') {
      if (otherContainer) {
        otherContainer.style.display = 'block';
        otherContainer.classList.add('slide-in');
      }
      if (otherInput) {
        otherInput.required = true;
        otherInput.focus();
      }
    } else {
      this.hideOtherInspectorField();
    }
  }

  hideOtherInspectorField() {
    const otherContainer = document.getElementById('otherInspectorContainer');
    const otherInput = document.getElementById('otherInspector');
    
    if (otherContainer) {
      otherContainer.style.display = 'none';
      otherContainer.classList.remove('slide-in');
    }
    if (otherInput) {
      otherInput.required = false;
      otherInput.value = '';
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

    if (elements.retryLoadData) {
      elements.retryLoadData.addEventListener('click', () => this.loadInitialData());
    }

    if (elements.inspectionModal) {
      elements.inspectionModal.addEventListener('hidden.bs.modal', () => {
        this.uiManager.resetForm();
        this.hideOtherInspectorField();
        
        setTimeout(() => {
          this.restartScannerAfterForm();
        }, 500);
      });

      elements.inspectionModal.addEventListener('show.bs.modal', () => {
        this.setDefaultDate();
        this.hideOtherInspectorField();
      });
    }

    // Event listener untuk tombol detail
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('view-detail') || e.target.closest('.view-detail')) {
        const button = e.target.classList.contains('view-detail') ? e.target : e.target.closest('.view-detail');
        const qrCode = button.getAttribute('data-qrcode');
        this.openDetailModal(qrCode);
      }
    });

    // Event listener untuk URL changes (untuk handle back/forward navigation)
    window.addEventListener('popstate', (e) => {
      this.handleURLQRCode();
    });
  }

  async loadInitialData() {
    try {
      await this.dataService.loadAllData();
      this.updateStats();
      this.refreshTable();
      
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.hideLoadingScreen();
      this.uiManager.showDataError('Gagal memuat data APAR: ' + error.message);
    }
  }

  updateStats() {
    try {
      const allData = this.dataService.getAllData();
      const totalAparCount = document.getElementById('totalAparCount');
      const goodAparCount = document.getElementById('goodAparCount');
      const needRepairCount = document.getElementById('needRepairCount');
      
      if (totalAparCount) totalAparCount.textContent = allData.length;
      
      let goodCount = 0;
      let needRepair = 0;
      
      allData.forEach(apar => {
        const status = this.inspectionService.getLastInspectionStatus(apar.QRCODE);
        if (status.status === 'Baik') goodCount++;
        else if (status.status === 'Perlu Perbaikan' || status.status === 'Kadaluarsa') needRepair++;
      });
      
      if (goodAparCount) goodAparCount.textContent = goodCount;
      if (needRepairCount) needRepairCount.textContent = needRepair;
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

  async restartScannerAfterForm() {
    try {
      await this.scanner.stopScanner();
      await new Promise(resolve => setTimeout(resolve, 500));

      const success = await this.scanner.startScanner(
        this.uiManager.elements.qrReader,
        (qrCode) => this.handleQRScan(qrCode)
      );
      
      if (success) this.uiManager.toggleScannerUI(true);
    } catch (error) {
      console.error('Error restarting scanner after form:', error);
    }
  }

  async handleQRScan(qrCode) {
    try {
      await this.scanner.stopScanner();
      const data = await this.dataService.fetchAPARData(qrCode);
      
      if (data) {
        this.inspectionService.setCurrentAPARId(qrCode);
        this.inspectionService.setCurrentAPARData(data);
        this.uiManager.renderTable([data], (aparId) => 
          this.inspectionService.getLastInspectionStatus(aparId)
        );
        this.showInspectionModal();
      } else {
        setTimeout(() => {
          this.restartScannerAfterForm();
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling QR scan:', error);
      showAlert('Terjadi kesalahan saat memproses QR Code', 'danger');
      
      setTimeout(() => {
        this.restartScannerAfterForm();
      }, 1000);
    }
  }

  showInspectionModal() {
    if (!this.uiManager.elements.inspectionModal) return;
    
    try {
      const inspectionModal = new bootstrap.Modal(this.uiManager.elements.inspectionModal);
      inspectionModal.show();
    } catch (error) {
      console.error('Error showing inspection modal:', error);
      this.uiManager.elements.inspectionModal.style.display = 'block';
      this.uiManager.elements.inspectionModal.classList.add('show');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    this.uiManager.setFormLoading(true);
    
    try {
      const formData = this.uiManager.getFormData();
      
      if (!formData.inspector || formData.inspector.trim() === '') {
        throw new Error('Nama pemeriksa harus diisi');
      }
      
      await this.inspectionService.saveInspection(formData);
      
      const inspectionModal = bootstrap.Modal.getInstance(this.uiManager.elements.inspectionModal);
      if (inspectionModal) inspectionModal.hide();
      
      this.uiManager.resetForm();
      this.hideOtherInspectorField();
      
      await this.refreshInspectionHistory();
      showAlert('✅ Data pemeriksaan berhasil disimpan!', 'success');
      
    } catch (error) {
      console.error('Error saving inspection:', error);
      showAlert(`❌ Gagal menyimpan data: ${error.message}`, 'danger');
    } finally {
      this.uiManager.setFormLoading(false);
    }
  }

  async refreshInspectionHistory() {
    try {
      await this.dataService.loadInspectionHistory();
      this.updateStats();
      this.refreshTable();
      
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

  loadAllInspectionHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    try {
      const serverInspections = this.dataService.getAllInspectionHistory();
      const groupedInspections = {};
      
      serverInspections.forEach(inspection => {
        const aparId = inspection.QRCODE;
        if (aparId) {
          if (!groupedInspections[aparId]) groupedInspections[aparId] = [];
          
          const convertedInspection = this.inspectionService.convertServerToLocalFormat(inspection);
          if (convertedInspection) groupedInspections[aparId].push(convertedInspection);
        }
      });
      
      this.uiManager.renderGroupedHistory(groupedInspections);
    } catch (error) {
      console.error('Error loading all inspection history:', error);
      showAlert('Gagal memuat riwayat pemeriksaan lengkap', 'warning');
      historyList.innerHTML = '<p class="text-muted text-center">Tidak ada riwayat pemeriksaan.</p>';
    }
  }

  // Method untuk membuka modal detail
  openDetailModal(qrCode) {
    this.detailModalManager.showDetailByQRCode(qrCode);
  }

  // Method untuk handle QR Code dari URL
  handleURLQRCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const qrCode = urlParams.get('qrcode');
    
    if (qrCode) {
      // Update URL tanpa reload page
      const newUrl = `${window.location.pathname}?qrcode=${qrCode}`;
      window.history.pushState({}, '', newUrl);
      
      // Show detail modal
      this.openDetailModal(qrCode);
    }
  }

  // Method untuk generate shareable URL
  generateShareableURL(qrCode) {
    return `${window.location.origin}${window.location.pathname}?qrcode=${qrCode}`;
  }
}

// Global function untuk akses dari luar (jika diperlukan)
window.openAPARDetail = function(qrCode) {
  if (window.aparApp) {
    window.aparApp.openDetailModal(qrCode);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.aparApp = new APARScannerApp();
  } catch (error) {
    console.error('Failed to initialize APAR Scanner App:', error);
    showAlert('Gagal memulai aplikasi. Silakan refresh halaman.', 'danger');
  }
});
