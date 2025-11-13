export class UIManager {
  constructor() {
    this.elements = this.initializeElements();
    this.ensureQRReaderElement();
    this.dataService = null;
  }

  initializeElements() {
    const elements = {
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
      inspectionModal: document.getElementById('inspectionModal')
    };

    // Tambahkan elemen loading dengan pengecekan null
    elements.dataLoading = document.getElementById('dataLoading');
    elements.dataError = document.getElementById('dataError');
    elements.emptyData = document.getElementById('emptyData');
    elements.retryLoadData = document.getElementById('retryLoadData');
    elements.errorMessage = document.getElementById('errorMessage');

    return elements;
  }

  ensureQRReaderElement() {
    if (!this.elements.qrReader) {
      console.error('QR Reader element not found!');
      return;
    }
    
    this.elements.qrReader.style.width = '100%';
    this.elements.qrReader.style.maxWidth = '400px';
    this.elements.qrReader.style.margin = '0 auto';
    this.elements.qrReader.style.display = 'none';
  }

  // Setter untuk DataService
  setDataService(dataService) {
    this.dataService = dataService;
  }

  toggleScannerUI(isStarting) {
    if (!this.elements.qrReader || !this.elements.stopScan || !this.elements.startScan) {
      console.error('Scanner UI elements not found');
      return;
    }

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
    if (!this.elements.submitText || !this.elements.submitSpinner) {
      console.warn('Form loading elements not found');
      return;
    }

    if (isLoading) {
      this.elements.submitText.style.display = 'none';
      this.elements.submitSpinner.style.display = 'inline-block';
    } else {
      this.elements.submitText.style.display = 'inline';
      this.elements.submitSpinner.style.display = 'none';
    }
  }

  resetForm() {
    if (this.elements.inspectionForm) {
      this.elements.inspectionForm.reset();
      
      const allButtons = document.querySelectorAll('.btn-check');
      allButtons.forEach(button => {
        button.checked = false;
      });
    }
    if (this.elements.inspectionDate) {
      this.elements.inspectionDate.value = new Date().toISOString().split('T')[0];
    }
  }

  // Method untuk menampilkan loading state dengan pengecekan null
  showDataLoading() {
    this.hideAllDataStates();
    if (this.elements.dataLoading) {
      this.elements.dataLoading.style.display = 'block';
    }
    if (this.elements.dataTable) {
      this.elements.dataTable.style.opacity = '0.5';
    }
  }

  hideDataLoading() {
    if (this.elements.dataLoading) {
      this.elements.dataLoading.style.display = 'none';
    }
    if (this.elements.dataTable) {
      this.elements.dataTable.style.opacity = '1';
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
    if (this.elements.emptyData) {
      this.elements.emptyData.style.display = 'block';
    }
  }

  showDataTable() {
    this.hideAllDataStates();
    if (this.elements.dataTable) {
      this.elements.dataTable.style.display = 'table';
    }
  }

  hideAllDataStates() {
    const elements = [
      'dataLoading', 'dataError', 'emptyData'
    ];
    
    elements.forEach(elementName => {
      if (this.elements[elementName]) {
        this.elements[elementName].style.display = 'none';
      }
    });
    
    if (this.elements.dataTable) {
      this.elements.dataTable.style.opacity = '1';
    }
  }

  // Method helper untuk format tanggal ke DD/MM/YYYY
  formatDateForDisplay(dateString) {
    if (!dateString) return '-';
    
    try {
      // Jika sudah format DD/MM/YYYY, return langsung
      if (dateString.includes('/')) {
        return dateString;
      }
      
      // Jika format ISO, konversi ke DD/MM/YYYY
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as-is jika parsing gagal
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return dateString;
    }
  }

  renderTable(data, getStatusFunction) {
    if (!this.elements.dataTable) {
      console.error('Data table element not found');
      return;
    }
    
    const tbody = this.elements.dataTable.querySelector('tbody');
    if (!tbody) {
      console.error('Table body not found');
      return;
    }
    
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
        <td>${this.formatDateForDisplay(row.Expired)}</td>
        <td>${row.QRCODE || '-'}</td>
        <td>${status.badge}</td>
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

  // Method untuk render grouped history dengan tampilan yang lebih baik
  renderGroupedHistory(allInspections) {
    const historyList = document.getElementById('historyList');
    if (!historyList) {
      console.error('History list element not found');
      return;
    }
    
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
    
    // Urutkan berdasarkan jumlah pemeriksaan (terbanyak dulu)
    const sortedAparIds = Object.keys(allInspections).sort((a, b) => {
      return allInspections[b].length - allInspections[a].length;
    });
    
    // Buat container untuk semua APAR
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
  }

  // Method baru untuk membuat card riwayat yang lebih menarik
  createEnhancedAparHistoryCard(aparId, inspections, aparData, inspectionCount, index) {
    const aparCard = document.createElement('div');
    aparCard.className = 'card mb-4 apar-history-card fade-in';
    aparCard.style.animationDelay = `${index * 0.1}s`;
    
    inspections.sort((a, b) => new Date(this.parseDateForSort(b.date)) - new Date(this.parseDateForSort(a.date)));
    const lastInspection = inspections[0];
    const status = this.calculateHistoryStatus(lastInspection);
    
    // Hitung statistik
    const stats = this.calculateInspectionStats(inspections);
    
    aparCard.innerHTML = `
      <div class="card-header bg-gradient-primary text-white">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <div class="apar-avatar me-3">
              <i class="bi bi-fire" style="font-size: 1.5rem;"></i>
            </div>
            <div>
              <h6 class="mb-1 fw-bold">APAR ${aparId}</h6>
              <div class="apar-details">
                <small>
                  <i class="bi bi-geo-alt"></i> ${aparData.Lokasi} • 
                  <i class="bi bi-tag"></i> ${aparData.Jenis} • 
                  <i class="bi bi-arrows-angle-expand"></i> ${aparData.Kapasitas}
                </small>
              </div>
            </div>
          </div>
          <div class="text-end">
            <span class="badge ${status.badgeClass} badge-lg">${status.text}</span>
            <div class="mt-1">
              <small><i class="bi bi-clock-history"></i> ${inspectionCount} pemeriksaan</small>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Statistik Ringkas -->
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
        
        <!-- Info Pemeriksaan Terakhir -->
        <div class="last-inspection-info mb-3 p-3 bg-light rounded">
          <h6 class="mb-2">
            <i class="bi bi-calendar-check"></i> Pemeriksaan Terakhir
          </h6>
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${this.formatDateForDisplay(lastInspection.date)}</strong>
              <br>
              <small class="text-muted">Oleh: ${lastInspection.inspector}</small>
            </div>
            <div class="text-end">
              <div class="text-sm">Expired: ${this.formatDateForDisplay(lastInspection.expired)}</div>
              <small class="${new Date(this.parseDateForSort(lastInspection.expired)) < new Date() ? 'text-danger' : 'text-success'}">
                ${new Date(this.parseDateForSort(lastInspection.expired)) < new Date() ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
              </small>
            </div>
          </div>
        </div>
        
        <!-- Timeline Pemeriksaan (Tampilkan langsung tanpa toggle) -->
        <div class="inspection-timeline mt-4">
          <div class="section-title mb-3">
            <h6 class="text-primary">
              <i class="bi bi-list-check"></i> Riwayat Pemeriksaan
            </h6>
          </div>
          <div id="inspections-${aparId}" class="timeline">
            <!-- Timeline items akan dimuat di sini -->
          </div>
        </div>
      </div>
    `;
    
    // Langsung muat timeline tanpa perlu toggle
    this.loadInspectionDetails(aparId, inspections);
    return aparCard;
  }

  // Method untuk parsing tanggal untuk sorting
  parseDateForSort(dateString) {
    if (!dateString) return new Date().toISOString();
    
    try {
      // Jika format DD/MM/YYYY, konversi ke YYYY-MM-DD untuk sorting
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      // Jika format ISO, return langsung
      return dateString;
    } catch (error) {
      console.error('Error parsing date for sort:', error);
      return new Date().toISOString();
    }
  }

  // Method untuk menghitung statistik pemeriksaan
  calculateInspectionStats(inspections) {
    const stats = {
      baik: 0,
      perluPerbaikan: 0,
      kadaluarsa: 0
    };
    
    inspections.forEach(inspection => {
      const status = this.calculateHistoryStatus(inspection);
      if (status.text === 'Baik') stats.baik++;
      else if (status.text === 'Perlu Perbaikan') stats.perluPerbaikan++;
      else if (status.text === 'Kadaluarsa') stats.kadaluarsa++;
    });
    
    return stats;
  }

  // Method untuk memuat detail pemeriksaan dalam format timeline
  loadInspectionDetails(aparId, inspections) {
    const inspectionsContainer = document.getElementById(`inspections-${aparId}`);
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
    
    // Buat timeline
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    
    inspections.forEach((inspection, index) => {
      const timelineItem = this.createTimelineItem(inspection, index, inspections.length);
      timeline.appendChild(timelineItem);
    });
    
    inspectionsContainer.appendChild(timeline);
  }

  // Method untuk membuat item timeline
  createTimelineItem(inspection, index, totalItems) {
    const timelineItem = document.createElement('div');
    timelineItem.className = `timeline-item ${index === 0 ? 'timeline-item-current' : ''}`;
    
    const status = this.calculateHistoryStatus(inspection);
    const isExpired = new Date(this.parseDateForSort(inspection.expired)) < new Date();
    
    timelineItem.innerHTML = `
      <div class="timeline-marker">
        <div class="timeline-dot ${status.badgeClass.replace('bg-', 'dot-')}">
          <i class="bi bi-${index === 0 ? 'star-fill' : 'check-circle'}"></i>
        </div>
        ${index < totalItems - 1 ? '<div class="timeline-line"></div>' : ''}
      </div>
      
      <div class="timeline-content">
        <div class="timeline-header">
          <div class="d-flex justify-content-between align-items-start">
            <h6 class="timeline-date">${this.formatDateForDisplay(inspection.date)}</h6>
            <span class="badge ${status.badgeClass}">${status.text}</span>
          </div>
          <p class="timeline-inspector mb-1">
            <i class="bi bi-person"></i> ${inspection.inspector}
          </p>
        </div>
        
        <div class="timeline-body">
          <div class="row">
            <div class="col-md-6">
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
            <div class="col-md-6">
              <div class="expiry-info">
                <p class="mb-1">
                  <strong>Expired:</strong> ${this.formatDateForDisplay(inspection.expired)}
                </p>
                <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
                  ${isExpired ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
                </span>
              </div>
            </div>
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

  // PERBAIKAN: Method untuk mendapatkan data APAR dari service
  getAparDataFromService(aparId) {
    if (!this.dataService) {
      console.warn('DataService tidak tersedia di UIManager');
      return {
        Lokasi: 'Tidak Diketahui',
        Jenis: 'Tidak Diketahui', 
        Kapasitas: 'Tidak Diketahui'
      };
    }
    
    try {
      const allData = this.dataService.getAllData();
      const aparData = allData.find(item => item.QRCODE === aparId);
      
      if (aparData) {
        return {
          Lokasi: aparData.Lokasi || 'Tidak Diketahui',
          Jenis: aparData.Jenis || 'Tidak Diketahui',
          Kapasitas: aparData.Kapasitas || 'Tidak Diketahui'
        };
      }
    } catch (error) {
      console.error('Error getting APAR data from service:', error);
    }
    
    return {
      Lokasi: 'Tidak Diketahui',
      Jenis: 'Tidak Diketahui',
      Kapasitas: 'Tidak Diketahui'
    };
  }

  calculateHistoryStatus(inspection) {
    if (!inspection) {
      return { text: 'Belum Diperiksa', badgeClass: 'bg-secondary' };
    }

    const today = new Date();
    const expiredDate = new Date(this.parseDateForSort(inspection.expired));
    const isExpired = expiredDate < today;
    
    const statusValues = [
      inspection.seal, inspection.handle, 
      inspection.tank, inspection.label, inspection.hose, 
      inspection.nozzle, inspection.bracket, inspection.sign
    ];
    
    const hasBadStatus = statusValues.some(value => value === 'tidak-baik') || isExpired;
    
    if (isExpired) {
      return { text: 'Kadaluarsa', badgeClass: 'bg-danger' };
    } else if (hasBadStatus) {
      return { text: 'Perlu Perbaikan', badgeClass: 'bg-warning' };
    } else {
      return { text: 'Baik', badgeClass: 'bg-success' };
    }
  }

  // PERBAIKAN: Method untuk membuat item history (untuk kompatibilitas)
  createHistoryItem(inspection, index) {
    if (!inspection) {
      console.error('Inspection data is null or undefined');
      return document.createElement('div'); // Return empty div
    }

    const historyItem = document.createElement('div');
    historyItem.className = 'card history-item m-3';
    
    const today = new Date();
    const expiredDate = new Date(this.parseDateForSort(inspection.expired));
    const isExpired = expiredDate < today;
    
    const statusValues = [
      inspection.seal, inspection.handle, 
      inspection.tank, inspection.label, inspection.hose, 
      inspection.nozzle, inspection.bracket, inspection.sign
    ];
    
    const hasBadStatus = statusValues.some(value => value === 'tidak-baik') || isExpired;
    
    let overallStatus, statusClass;
    if (isExpired) {
      overallStatus = 'Kadaluarsa';
      statusClass = 'bg-danger';
    } else if (hasBadStatus) {
      overallStatus = 'Perlu Perbaikan';
      statusClass = 'bg-warning';
    } else {
      overallStatus = 'Baik';
      statusClass = 'bg-success';
    }
    
    // Format tanggal dengan handling error
    let expiredFormatted = 'Invalid Date';
    try {
      expiredFormatted = this.formatDateForDisplay(inspection.expired);
    } catch (error) {
      console.warn('Error formatting date:', error);
      expiredFormatted = inspection.expired || 'Tanggal tidak valid';
    }
    
    historyItem.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="card-title mb-0">Pemeriksaan ${this.formatDateForDisplay(inspection.date)}</h6>
          <div>
            <span class="badge ${statusClass}">${overallStatus}</span>
            ${inspection.inspector ? `<small class="text-muted ms-2">Oleh: ${inspection.inspector}</small>` : ''}
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <p class="mb-1"><strong>Tanggal Expired:</strong> ${expiredFormatted} ${isExpired ? '<span class="text-danger">(Kadaluarsa)</span>' : '<span class="text-success">(Masih Berlaku)</span>'}</p>
            <p class="mb-1"><strong>Segel/Pin:</strong> ${this.getStatusBadge(inspection.seal)}</p>
            <p class="mb-1"><strong>Handle/Tuas:</strong> ${this.getStatusBadge(inspection.handle)}</p>
            <p class="mb-1"><strong>Tabung:</strong> ${this.getStatusBadge(inspection.tank)}</p>
            <p class="mb-1"><strong>Label/Stiker:</strong> ${this.getStatusBadge(inspection.label)}</p>
          </div>
          <div class="col-md-6">
            <p class="mb-1"><strong>Selang/Hose:</strong> ${this.getStatusBadge(inspection.hose)}</p>
            <p class="mb-1"><strong>Nozzle/Corong:</strong> ${this.getStatusBadge(inspection.nozzle)}</p>
            <p class="mb-1"><strong>Manometer:</strong> ${this.getGaugeStatus(inspection.gauge)}</p>
            <p class="mb-1"><strong>Bracket/Dudukan:</strong> ${this.getStatusBadge(inspection.bracket)}</p>
            <p class="mb-1"><strong>Rambu/Tanda:</strong> ${this.getStatusBadge(inspection.sign)}</p>
          </div>
        </div>
        ${inspection.notes ? `
          <div class="mt-2">
            <strong>Keterangan:</strong> ${inspection.notes}
          </div>
        ` : ''}
      </div>
    `;
    
    return historyItem;
  }

  getStatusBadge(value) {
    return value === 'baik' 
      ? '<span class="text-success">✓ Baik</span>' 
      : '<span class="text-danger">✗ Tidak Baik</span>';
  }

  getGaugeStatus(value) {
    if (value === 'baik') return '<span class="text-success">✓ Baik</span>';
    if (value === 'tidak-baik') return '<span class="text-danger">✗ Tidak Baik</span>';
    return '<span class="text-muted">Tidak Ada</span>';
  }
}

export function showAlert(message, type) {
  const resultBox = document.getElementById('resultBox');
  if (resultBox) {
    resultBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }
}