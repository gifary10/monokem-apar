import { createHistoryItem } from './utils.js';
import { CONFIG } from './config.js';
import { showAlert } from './ui-manager.js';

export class InspectionService {
  constructor() {
    this.currentAPARId = null;
    this.currentAPARData = null;
    this.dataService = null;
  }

  // Setter untuk DataService
  setDataService(dataService) {
    this.dataService = dataService;
  }

  setCurrentAPARId(aparId) {
    this.currentAPARId = aparId;
  }

  setCurrentAPARData(aparData) {
    this.currentAPARData = aparData;
  }

  getCurrentAPARId() {
    return this.currentAPARId;
  }

  validateFormData(formData) {
    const requiredFields = [
      'date', 'expired', 'seal', 'handle', 'tank', 
      'label', 'hose', 'nozzle', 'bracket', 'sign', 'inspector'
    ];
    
    const fieldNames = {
      date: 'Tanggal Pemeriksaan',
      expired: 'Tanggal Expired',
      seal: 'Segel/Pin',
      handle: 'Handle/Tuas',
      tank: 'Tabung',
      label: 'Label/Stiker',
      hose: 'Selang/Hose',
      nozzle: 'Nozzle/Corong',
      bracket: 'Bracket/Dudukan',
      sign: 'Rambu/Tanda',
      inspector: 'Nama Pemeriksa'
    };
    
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        return { isValid: false, message: `Harap isi field: ${fieldNames[field]}` };
      }
    }
    
    return { isValid: true };
  }

  async saveInspection(formData) {
    const validation = this.validateFormData(formData);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    if (!this.currentAPARId) {
      throw new Error('Tidak ada APAR yang dipilih untuk diperiksa');
    }

    const inspectionData = {
      aparId: this.currentAPARId,
      date: formData.date,
      inspector: formData.inspector || 'Tidak Diketahui',
      expired: formData.expired,
      lokasi: this.currentAPARData?.Lokasi || '',
      jenis: this.currentAPARData?.Jenis || '',
      kapasitas: this.currentAPARData?.Kapasitas || '',
      seal: formData.seal,
      handle: formData.handle,
      tank: formData.tank,
      label: formData.label,
      hose: formData.hose,
      nozzle: formData.nozzle,
      gauge: formData.gauge || 'tidak-ada',
      bracket: formData.bracket,
      sign: formData.sign,
      notes: formData.notes || '',
      timestamp: new Date().toISOString(),
      status: this.calculateOverallStatus(formData)
    };

    // Langsung kirim ke Google Sheets (code2.gs) untuk disimpan
    try {
      await this.sendToGoogleSheets(inspectionData);
      console.log('Data berhasil dikirim ke Google Sheets (code2.gs)');
      
      // Refresh data riwayat dari server (code1.gs sheet Rekap)
      if (this.dataService) {
        await this.dataService.loadInspectionHistory();
      }
      
    } catch (error) {
      console.error('Gagal mengirim ke Google Sheets:', error);
      throw new Error(`Gagal menyimpan data: ${error.message}`);
    }

    return inspectionData;
  }

  async sendToGoogleSheets(inspectionData) {
    try {
      const payload = {
        qr_code: inspectionData.aparId,
        tanggal_pemeriksaan: inspectionData.date,
        nama_pemeriksa: inspectionData.inspector,
        tanggal_expired: inspectionData.expired,
        lokasi: inspectionData.lokasi,
        jenis: inspectionData.jenis,
        kapasitas: inspectionData.kapasitas,
        segel_pin: this.getDisplayStatus(inspectionData.seal),
        handle_tuas: this.getDisplayStatus(inspectionData.handle),
        tabung: this.getDisplayStatus(inspectionData.tank),
        label_stiker: this.getDisplayStatus(inspectionData.label),
        selang_hose: this.getDisplayStatus(inspectionData.hose),
        nozzle_corong: this.getDisplayStatus(inspectionData.nozzle),
        manometer: this.getGaugeDisplayStatus(inspectionData.gauge),
        bracket_dudukan: this.getDisplayStatus(inspectionData.bracket),
        rambu_tanda: this.getDisplayStatus(inspectionData.sign),
        keterangan: inspectionData.notes,
        status: inspectionData.status
      };

      console.log('Mengirim data ke Google Sheets (code2.gs):', payload);

      const response = await fetch(CONFIG.inspectionSheetURL, {
        method: 'POST',
        body: new URLSearchParams(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Response dari Google Sheets (code2.gs):', result);
      
      return result;
      
    } catch (error) {
      console.error('Error sending to Google Sheets:', error);
      throw new Error(`Gagal mengirim data ke server: ${error.message}`);
    }
  }

  getDisplayStatus(status) {
    return status === 'baik' ? 'Baik' : 'Tidak Baik';
  }

  getGaugeDisplayStatus(gauge) {
    switch(gauge) {
      case 'baik': return 'Baik';
      case 'tidak-baik': return 'Tidak Baik';
      case 'tidak-ada': return 'Tidak Ada';
      default: return 'Tidak Ada';
    }
  }

  calculateOverallStatus(inspectionData) {
    const today = new Date();
    const expiredDate = new Date(inspectionData.expired);
    const isExpired = expiredDate < today;
    
    const statusValues = [
      inspectionData.seal, inspectionData.handle, 
      inspectionData.tank, inspectionData.label, inspectionData.hose, 
      inspectionData.nozzle, inspectionData.bracket, inspectionData.sign
    ];
    
    const hasBadStatus = statusValues.some(value => value === 'tidak-baik') || isExpired;
    
    if (isExpired) {
      return 'Kadaluarsa';
    } else if (hasBadStatus) {
      return 'Perlu Perbaikan';
    } else {
      return 'Baik';
    }
  }

  // PERBAIKAN: Method untuk mendapatkan riwayat inspeksi dengan error handling yang lebih baik
  getInspectionHistory(aparId) {
    if (!aparId) {
      console.warn('No APAR ID provided for inspection history');
      return [];
    }

    try {
      const serverInspections = this.dataService ? 
        (this.dataService.getInspectionHistoryByQRCode(aparId) || []) : [];
      
      const allInspections = serverInspections
        .map(serverInspection => {
          try {
            return this.convertServerToLocalFormat(serverInspection);
          } catch (error) {
            console.error('Error converting server inspection:', error);
            return null;
          }
        })
        .filter(inspection => inspection !== null); // Hapus yang null
      
      // Urutkan berdasarkan tanggal (terbaru dulu) dengan handling error
      return allInspections.sort((a, b) => {
        try {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          
          // Handle invalid dates
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      });
    } catch (error) {
      console.error('Error getting inspection history:', error);
      return [];
    }
  }

  // Method untuk mengkonversi format data server ke format lokal
  convertServerToLocalFormat(serverInspection) {
    if (!serverInspection) {
      console.warn('Server inspection data is null or undefined');
      return null;
    }

    return {
      aparId: serverInspection.QRCODE || '',
      date: serverInspection.Tanggal_Pemeriksaan || '',
      inspector: serverInspection.Nama_Pemeriksa || '',
      expired: serverInspection.Tanggal_Expired || '',
      lokasi: serverInspection.Lokasi || '',
      jenis: serverInspection.Jenis || '',
      kapasitas: serverInspection.Kapasitas || '',
      seal: this.convertStatusToLocal(serverInspection.Segel_Pin),
      handle: this.convertStatusToLocal(serverInspection.Handle_Tuas),
      tank: this.convertStatusToLocal(serverInspection.Tabung),
      label: this.convertStatusToLocal(serverInspection.Label_Stiker),
      hose: this.convertStatusToLocal(serverInspection.Selang_Hose),
      nozzle: this.convertStatusToLocal(serverInspection.Nozzle_Corong),
      gauge: this.convertGaugeStatusToLocal(serverInspection.Manometer),
      bracket: this.convertStatusToLocal(serverInspection.Bracket_Dudukan),
      sign: this.convertStatusToLocal(serverInspection.Rambu_Tanda),
      notes: serverInspection.Keterangan || '',
      timestamp: serverInspection.Tanggal_Pemeriksaan ? 
        new Date(serverInspection.Tanggal_Pemeriksaan).toISOString() : new Date().toISOString(),
      status: serverInspection.Status || 'Belum Diperiksa'
    };
  }

  convertStatusToLocal(status) {
    if (!status) return 'tidak-baik';
    return status === 'Baik' ? 'baik' : 'tidak-baik';
  }

  convertGaugeStatusToLocal(status) {
    if (!status) return 'tidak-ada';
    if (status === 'Baik') return 'baik';
    if (status === 'Tidak Baik') return 'tidak-baik';
    return 'tidak-ada';
  }

  // Method untuk mendapatkan semua inspeksi yang dikelompokkan
  getAllInspectionsGrouped() {
    try {
      // Ambil data dari server saja (code1.gs sheet Rekap)
      const serverInspections = this.dataService ? 
        (this.dataService.getAllInspectionHistory() || []) : [];
      
      // Kelompokkan berdasarkan QR Code
      const groupedInspections = {};
      
      serverInspections.forEach(serverInspection => {
        const aparId = serverInspection.QRCODE;
        if (aparId) {
          if (!groupedInspections[aparId]) {
            groupedInspections[aparId] = [];
          }
          
          const convertedInspection = this.convertServerToLocalFormat(serverInspection);
          if (convertedInspection) {
            groupedInspections[aparId].push(convertedInspection);
          }
        }
      });
      
      return groupedInspections;
    } catch (error) {
      console.error('Error getting all inspections grouped:', error);
      return {};
    }
  }

  getLastInspectionStatus(aparId) {
    if (!aparId) {
      return { 
        status: 'Belum Diperiksa', 
        badge: '<span class="badge bg-secondary">Belum Diperiksa</span>' 
      };
    }

    try {
      const inspections = this.getInspectionHistory(aparId);
      
      if (inspections.length === 0) {
        return { 
          status: 'Belum Diperiksa', 
          badge: '<span class="badge bg-secondary">Belum Diperiksa</span>' 
        };
      }
      
      inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastInspection = inspections[0];
      
      const today = new Date();
      const expiredDate = new Date(lastInspection.expired);
      const isExpired = expiredDate < today;
      
      const statusValues = [
        lastInspection.seal, lastInspection.handle, 
        lastInspection.tank, lastInspection.label, lastInspection.hose, 
        lastInspection.nozzle, lastInspection.bracket, lastInspection.sign
      ];
      
      const hasBadStatus = statusValues.some(value => value === 'tidak-baik') || isExpired;
      
      if (hasBadStatus) {
        if (isExpired) {
          return { 
            status: 'Kadaluarsa', 
            badge: '<span class="badge bg-danger">Kadaluarsa</span>' 
          };
        } else {
          return { 
            status: 'Perlu Perbaikan', 
            badge: '<span class="badge bg-warning">Perlu Perbaikan</span>' 
          };
        }
      } else {
        return { 
          status: 'Baik', 
          badge: '<span class="badge bg-success">Baik</span>' 
        };
      }
    } catch (error) {
      console.error('Error getting last inspection status:', error);
      return { 
        status: 'Belum Diperiksa', 
        badge: '<span class="badge bg-secondary">Belum Diperiksa</span>' 
      };
    }
  }

  renderHistoryList(historyContainer, aparId) {
    if (!historyContainer) {
      console.error('History container element not found');
      return;
    }
    
    try {
      const inspections = this.getInspectionHistory(aparId);
      
      if (inspections.length === 0) {
        historyContainer.innerHTML = '<p class="text-muted">Belum ada riwayat pemeriksaan untuk APAR ini.</p>';
        return;
      }
      
      historyContainer.innerHTML = '';
      
      inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      inspections.forEach((inspection, index) => {
        const historyItem = createHistoryItem(inspection, index);
        if (historyItem) {
          historyContainer.appendChild(historyItem);
        }
      });
    } catch (error) {
      console.error('Error rendering history list:', error);
      historyContainer.innerHTML = '<p class="text-muted text-danger">Gagal memuat riwayat pemeriksaan.</p>';
    }
  }
}