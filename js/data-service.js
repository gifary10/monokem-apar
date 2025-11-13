import { CONFIG } from './config.js';
import { showAlert } from './ui-manager.js';

export class DataService {
  constructor() {
    this.allAPARData = [];
    this.allInspectionHistory = [];
  }

  async fetchAPARData(qrId) {
    try {
      if (!qrId || qrId.trim() === '') {
        showAlert('QR Code tidak valid', 'danger');
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${CONFIG.scriptURL}?id=${encodeURIComponent(qrId)}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      if (!data || !data.QRCODE) {
        showAlert(`❌ Data tidak ditemukan untuk QRCODE: <b>${qrId}</b>`, 'danger');
        return null;
      }

      showAlert(`✅ Data ditemukan untuk QRCODE: <b>${qrId}</b>`, 'success');
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      
      let errorMessage = '❌ Terjadi kesalahan saat mengambil data';
      if (error.name === 'AbortError') {
        errorMessage = '❌ Timeout: Gagal mengambil data dari server';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '❌ Gagal terhubung ke server. Periksa koneksi internet Anda.';
      }
      
      showAlert(errorMessage, 'danger');
      return null;
    }
  }

  async loadAllData() {
    try {
      this.uiManager.showDataLoading();
      
      // Load master APAR data
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(CONFIG.scriptURL, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data)) {
        this.allAPARData = data;
        console.log(`Loaded ${data.length} APAR records`);
      } else {
        this.allAPARData = [];
        console.warn('No data found or data is not an array');
      }
      
      // Load inspection history data
      await this.loadInspectionHistory();
      
      return this.allAPARData;
    } catch (error) {
      console.error('Error loading all data:', error);
      
      let errorMessage = 'Gagal memuat data APAR dari server';
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: Gagal memuat data dari server';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
      }
      
      throw new Error(errorMessage);
    } finally {
      this.uiManager.hideDataLoading();
    }
  }

  // Method untuk memuat data riwayat pemeriksaan
  async loadInspectionHistory() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${CONFIG.scriptURL}?action=get_inspections`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data)) {
        this.allInspectionHistory = data;
        console.log(`Loaded ${data.length} inspection history records`);
      } else {
        this.allInspectionHistory = [];
        console.warn('No inspection history found or data is not an array');
      }
      
      return this.allInspectionHistory;
    } catch (error) {
      console.error('Error loading inspection history:', error);
      // Tidak throw error karena ini data sekunder
      this.allInspectionHistory = [];
    }
  }

  // Method untuk mendapatkan riwayat pemeriksaan berdasarkan QR Code
  getInspectionHistoryByQRCode(qrCode) {
    if (!this.allInspectionHistory || this.allInspectionHistory.length === 0) {
      return [];
    }
    
    return this.allInspectionHistory.filter(inspection => 
      inspection.QRCODE === qrCode
    );
  }

  // Method untuk mendapatkan semua data riwayat pemeriksaan
  getAllInspectionHistory() {
    return this.allInspectionHistory;
  }

  getAllData() {
    return this.allAPARData;
  }

  // Method untuk mendapatkan data APAR berdasarkan QR Code
  getAPARByQRCode(qrCode) {
    return this.allAPARData.find(apar => apar.QRCODE === qrCode);
  }

  // Setter untuk UIManager
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }
}