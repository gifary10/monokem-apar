export class UIManager {
  constructor() {
    this.elements = this.initializeElements();
    this.ensureQRReaderElement();
    this.dataService = null;
  }

  initializeElements() {
    return {
      startScan: document.getElementById('startScan'),
      stopScan: document.getElementById('stopScan'),
      qrReader: document.getElementById('qr-reader'),
      dataTable: document.getElementById('dataTable'),
      resultBox: document.getElementById('resultBox'),
      inspectionForm: document.getElementById('inspectionForm'),
      historyList: document.getElementById('historyList'),
      inspectionDate: document.getElementById('inspectionDate'),
      submitText: document.getElementById('submitText'),
      submitSpinner: document.getElementById('submitSpinner'),
      inspectionModal: document.getElementById('inspectionModal'),
      dataError: document.getElementById('dataError'),
      emptyData: document.getElementById('emptyData'),
      retryLoadData: document.getElementById('retryLoadData'),
      errorMessage: document.getElementById('errorMessage')
    };
  }

  ensureQRReaderElement() {
    if (!this.elements.qrReader) return;
    
    this.elements.qrReader.style.width = '100%';
    this.elements.qrReader.style.maxWidth = '400px';
    this.elements.qrReader.style.margin = '0 auto';
    this.elements.qrReader.style.display = 'none';
  }

  setDataService(dataService) {
    this.dataService = dataService;
  }

  toggleScannerUI(isStarting) {
    if (!this.elements.qrReader || !this.elements.stopScan || !this.elements.startScan) return;

    if (isStarting) {
      this.elements.qrReader.style.display = "block";
      this.elements.stopScan.style.display = "inline-block";
      this.elements.startScan.style.display = "none";
      
      setTimeout(() => {
        this.elements.qrReader.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    } else {
      this.elements.qrReader.style.display = "none";
      this.elements.stopScan.style.display = "none";
      this.elements.startScan.style.display = "inline-block";
    }
  }

  setFormLoading(isLoading) {
    if (!this.elements.submitText || !this.elements.submitSpinner) return;

    if (isLoading) {
      this.elements.submitText.style.display = 'none';
      this.elements.submitSpinner.style.display = 'inline-block';
    } else {
      this.elements.submitText.style.display = 'inline';
      this.elements.submitSpinner.style.display = 'none';
    }
  }

  resetForm() {
    if (this.elements.inspectionForm) this.elements.inspectionForm.reset();
    if (this.elements.inspectionDate) {
      this.elements.inspectionDate.value = new Date().toISOString().split('T')[0];
    }
  }

  showDataError(message = 'Gagal memuat data APAR') {
    this.hideAllDataStates();
    if (this.elements.dataError && this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.dataError.style.display = 'block';
    }
  }

  showEmptyData() {
    this.hideAllDataStates();
    if (this.elements.emptyData) this.elements.emptyData.style.display = 'block';
  }

  showDataTable() {
    this.hideAllDataStates();
    if (this.elements.dataTable) this.elements.dataTable.style.display = 'table';
  }

  hideAllDataStates() {
    const elements = ['dataError', 'emptyData'];
    
    elements.forEach(elementName => {
      if (this.elements[elementName]) this.elements[elementName].style.display = 'none';
    });
    
    if (this.elements.dataTable) this.elements.dataTable.style.opacity = '1';
  }

  renderTable(data, getStatusFunction) {
    if (!this.elements.dataTable) return;
    
    const tbody = this.elements.dataTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      this.showEmptyData();
      return;
    }
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      const status = getStatusFunction(row.QRCODE);
      
      tr.innerHTML = `
        <td>${row.Lokasi || '-'}</td>
        <td>${row.Jenis || '-'}</td>
        <td>${row.Kapasitas || '-'}</td>
        <td>${row.Expired || '-'}</td>
        <td>${row.QRCODE || '-'}</td>
        <td>${status.badge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary view-detail" data-qrcode="${row.QRCODE}">
            <i class="bi bi-eye"></i> Detail
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    this.showDataTable();
  }

  getFormData() {
    let inspectorName = '';
    const inspectorDropdown = document.getElementById('inspectorName');
    const otherInspectorInput = document.getElementById('otherInspector');
    
    if (inspectorDropdown) {
      const dropdownValue = inspectorDropdown.value;
      if (dropdownValue === 'Other' && otherInspectorInput) {
        inspectorName = otherInspectorInput.value;
      } else {
        inspectorName = dropdownValue;
      }
    }

    return {
      date: this.elements.inspectionDate ? this.elements.inspectionDate.value : '',
      inspector: inspectorName,
      expired: document.getElementById('expiredDate') ? document.getElementById('expiredDate').value : '',
      seal: document.querySelector('input[name="seal"]:checked')?.value || '',
      handle: document.querySelector('input[name="handle"]:checked')?.value || '',
      tank: document.querySelector('input[name="tank"]:checked')?.value || '',
      label: document.querySelector('input[name="label"]:checked')?.value || '',
      hose: document.querySelector('input[name="hose"]:checked')?.value || '',
      nozzle: document.querySelector('input[name="nozzle"]:checked')?.value || '',
      gauge: document.querySelector('input[name="gauge"]:checked')?.value || 'tidak-ada',
      bracket: document.querySelector('input[name="bracket"]:checked')?.value || '',
      sign: document.querySelector('input[name="sign"]:checked')?.value || '',
      notes: document.getElementById('notes') ? document.getElementById('notes').value : ''
    };
  }

  renderGroupedHistory(allInspections) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (!allInspections || Object.keys(allInspections).length === 0) {
      historyList.innerHTML = `
        <div class="empty-state text-center py-5">
          <i class="bi bi-clock-history" style="font-size: 4rem; opacity: 0.3;"></i>
          <h5 class="mt-3 text-muted">Belum Ada Riwayat Pemeriksaan</h5>
          <p class="text-muted">Mulai scan QR Code APAR untuk menambahkan riwayat pemeriksaan pertama</p>
        </div>
      `;
      return;
    }
    
    try {
      const sortedAparIds = Object.keys(allInspections).sort((a, b) => {
        return allInspections[b].length - allInspections[a].length;
      });
      
      const historyContainer = document.createElement('div');
      historyContainer.className = 'history-container';
      
      sortedAparIds.forEach((aparId, index) => {
        const inspections = allInspections[aparId];
        const inspectionCount = inspections.length;
        const aparData = this.getAparDataFromService(aparId);
        const aparCard = this.createEnhancedAparHistoryCard(aparId, inspections, aparData, inspectionCount, index);
        historyContainer.appendChild(aparCard);
      });
      
      historyList.appendChild(historyContainer);
    } catch (error) {
      historyList.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle"></i> 
          Gagal memuat riwayat pemeriksaan: ${error.message}
        </div>
      `;
    }
  }

  createEnhancedAparHistoryCard(aparId, inspections, aparData, inspectionCount, index) {
    const safeAparId = this.sanitizeId(aparId);
    const aparCard = document.createElement('div');
    aparCard.className = 'card mb-4 apar-history-card fade-in';
    aparCard.style.animationDelay = `${index * 0.1}s`;
    
    inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastInspection = inspections[0];
    const status = this.calculateHistoryStatus(lastInspection);
    const stats = this.calculateInspectionStats(inspections);
    
    aparCard.innerHTML = `
      <div class="card-header bg-gradient-primary text-white">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <div class="apar-avatar me-3">
              <i class="bi bi-fire text-white" style="font-size: 1.5rem;"></i>
            </div>
            <div>
              <h6 class="mb-1 fw-bold">${aparData.Lokasi || aparId}</h6>
              <div class="apar-details">
                <small>
                  ${aparData.Jenis ? `Jenis: ${aparData.Jenis}` : ''} 
                  ${aparData.Kapasitas ? ` • Kapasitas: ${aparData.Kapasitas}` : ''}
                </small>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-light view-detail" data-qrcode="${aparId}">
            <i class="bi bi-eye"></i> Detail
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div class="row text-center mb-3 stats-overview">
          <div class="col-4">
            <div class="stat-item">
              <div class="stat-value text-success">${stats.baik}</div>
              <div class="stat-label">Baik</div>
            </div>
          </div>
          <div class="col-4">
            <div class="stat-item">
              <div class="stat-value text-warning">${stats.perluPerbaikan}</div>
              <div class="stat-label">Perlu Perbaikan</div>
            </div>
          </div>
          <div class="col-4">
            <div class="stat-item">
              <div class="stat-value text-danger">${stats.kadaluarsa}</div>
              <div class="stat-label">Kadaluarsa</div>
            </div>
          </div>
        </div>
        
        <div class="last-inspection-info mb-3 p-3 bg-light rounded">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Pemeriksaan Terakhir</h6>
            <span class="badge ${status.badgeClass}">${status.text}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${lastInspection.date}</strong>
              <br>
              <small class="text-muted">Oleh: ${lastInspection.inspector}</small>
            </div>
            <div class="text-end">
              <div class="text-sm">Expired: ${lastInspection.expired}</div>
              <small class="${new Date(lastInspection.expired) < new Date() ? 'text-danger' : 'text-success'}">
                ${new Date(lastInspection.expired) < new Date() ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
              </small>
            </div>
          </div>
        </div>
        
        <div class="inspection-timeline mt-4">
          <div id="inspections-${safeAparId}" class="timeline">
            <div class="text-center py-3">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Memuat...</span>
              </div>
              <span class="ms-2">Memuat riwayat...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    setTimeout(() => this.loadInspectionDetails(aparId, inspections), 200);
    return aparCard;
  }

  calculateInspectionStats(inspections) {
    const stats = { baik: 0, perluPerbaikan: 0, kadaluarsa: 0 };
    
    inspections.forEach(inspection => {
      const status = this.calculateHistoryStatus(inspection);
      if (status.text === 'Baik') stats.baik++;
      else if (status.text === 'Perlu Perbaikan') stats.perluPerbaikan++;
      else if (status.text === 'Kadaluarsa') stats.kadaluarsa++;
    });
    
    return stats;
  }

  loadInspectionDetails(aparId, inspections) {
    setTimeout(() => {
      const safeAparId = this.sanitizeId(aparId);
      const inspectionsContainer = document.getElementById(`inspections-${safeAparId}`);
      
      if (!inspectionsContainer) return;
      
      inspectionsContainer.innerHTML = '';
      
      if (inspections.length === 0) {
        inspectionsContainer.innerHTML = `
          <div class="text-center py-4 text-muted">
            <i class="bi bi-inbox" style="font-size: 2rem;"></i>
            <p class="mt-2">Belum ada riwayat pemeriksaan</p>
          </div>
        `;
        return;
      }
      
      const timeline = document.createElement('div');
      timeline.className = 'timeline';
      
      inspections.forEach((inspection, index) => {
        const timelineItem = this.createTimelineItem(inspection, index, inspections.length, aparId);
        timeline.appendChild(timelineItem);
      });
      
      inspectionsContainer.appendChild(timeline);
    }, 150);
  }

  sanitizeId(id) {
    if (!id) return 'unknown';
    return id.toString()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  createTimelineItem(inspection, index, totalItems, aparId) {
    const timelineItem = document.createElement('div');
    timelineItem.className = `timeline-item ${index === 0 ? 'timeline-item-current' : ''}`;
    
    const status = this.calculateHistoryStatus(inspection);
    const isExpired = new Date(inspection.expired) < new Date();
    
    timelineItem.innerHTML = `
      <div class="timeline-content">
        <div class="timeline-header">
          <div class="d-flex justify-content-between align-items-start">
            <h6 class="timeline-date">${inspection.date}</h6>
            <div>
              <span class="badge ${status.badgeClass} me-2">${status.text}</span>
            </div>
          </div>
          <p class="timeline-inspector mb-1">${inspection.inspector}</p>
        </div>
        
        <div class="timeline-body">
          <div class="row">
            <div class="col-4 col-md-6">
              <div class="component-status">
                <span class="status-item ${inspection.seal === 'baik' ? 'status-good' : 'status-bad'}">
                  Segel: ${inspection.seal === 'baik' ? '✓' : '✗'}
                </span>
                <span class="status-item ${inspection.handle === 'baik' ? 'status-good' : 'status-bad'}">
                  Handle: ${inspection.handle === 'baik' ? '✓' : '✗'}
                </span>
                <span class="status-item ${inspection.tank === 'baik' ? 'status-good' : 'status-bad'}">
                  Tabung: ${inspection.tank === 'baik' ? '✓' : '✗'}
                </span>
              </div>
            </div>
            
            <div class="col-4 col-md-6">
              <div class="component-status">
                <span class="status-item ${inspection.label === 'baik' ? 'status-good' : 'status-bad'}">
                  Label: ${inspection.label === 'baik' ? '✓' : '✗'}
                </span>
                <span class="status-item ${inspection.hose === 'baik' ? 'status-good' : 'status-bad'}">
                  Selang: ${inspection.hose === 'baik' ? '✓' : '✗'}
                </span>
                <span class="status-item ${inspection.nozzle === 'baik' ? 'status-good' : 'status-bad'}">
                  Nozzle: ${inspection.nozzle === 'baik' ? '✓' : '✗'}
                </span>
              </div>
            </div>
            
            <div class="col-4 col-md-6">
              <div class="component-status">
                <span class="status-item ${inspection.gauge === 'baik' ? 'status-good' : inspection.gauge === 'tidak-baik' ? 'status-bad' : 'status-na'}">
                  Preasure: ${inspection.gauge === 'baik' ? '✓' : inspection.gauge === 'tidak-baik' ? '✗' : 'N/A'}
                </span>
                <span class="status-item ${inspection.bracket === 'baik' ? 'status-good' : 'status-bad'}">
                  Bracket: ${inspection.bracket === 'baik' ? '✓' : '✗'}
                </span>
                <span class="status-item ${inspection.sign === 'baik' ? 'status-good' : 'status-bad'}">
                  Rambu: ${inspection.sign === 'baik' ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
          
          <div class="expiry-info mt-2">
                <p class="mb-1"><strong>Expired:</strong> ${inspection.expired}</p>
                <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
                  ${isExpired ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
                </span>
          </div>
          
          ${inspection.notes ? `
            <div class="timeline-notes mt-2">
              <strong>Keterangan:</strong> 
              <p class="mb-0">${inspection.notes}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return timelineItem;
  }

  getAparDataFromService(aparId) {
    if (!this.dataService) {
      return {
        Lokasi: 'Data Tidak Tersedia',
        Jenis: 'Data Tidak Tersedia', 
        Kapasitas: 'Data Tidak Tersedia'
      };
    }
    
    try {
      const allData = this.dataService.getAllData();
      if (!allData || !Array.isArray(allData)) {
        return {
          Lokasi: 'Data Tidak Ditemukan',
          Jenis: 'Data Tidak Ditemukan',
          Kapasitas: 'Data Tidak Ditemukan'
        };
      }
      
      const aparData = allData.find(item => item.QRCODE === aparId);
      
      if (aparData) {
        return {
          Lokasi: aparData.Lokasi || 'Tidak Diketahui',
          Jenis: aparData.Jenis || 'Tidak Diketahui',
          Kapasitas: aparData.Kapasitas || 'Tidak Diketahui'
        };
      } else {
        return {
          Lokasi: 'Tidak Diketahui',
          Jenis: 'Tidak Diketahui',
          Kapasitas: 'Tidak Diketahui'
        };
      }
    } catch (error) {
      return {
        Lokasi: 'Error Load Data',
        Jenis: 'Error Load Data',
        Kapasitas: 'Error Load Data'
      };
    }
  }

  calculateHistoryStatus(inspection) {
    if (!inspection) return { text: 'Belum Diperiksa', badgeClass: 'bg-secondary' };

    const today = new Date();
    const expiredDate = new Date(inspection.expired);
    const isExpired = expiredDate < today;
    
    const statusValues = [
      inspection.seal, inspection.handle, 
      inspection.tank, inspection.label, inspection.hose, 
      inspection.nozzle, inspection.bracket, inspection.sign
    ];
    
    const hasBadStatus = statusValues.some(value => value === 'tidak-baik') || isExpired;
    
    if (isExpired) return { text: 'Kadaluarsa', badgeClass: 'bg-danger' };
    else if (hasBadStatus) return { text: 'Perlu Perbaikan', badgeClass: 'bg-warning' };
    else return { text: 'Baik', badgeClass: 'bg-success' };
  }
}

export function showAlert(message, type) {
  const resultBox = document.getElementById('resultBox');
  if (resultBox) resultBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}
