import { CONFIG } from './config.js';
import { showAlert } from './ui-manager.js';

export class DetailModalManager {
    constructor(dataService, inspectionService) {
        this.dataService = dataService;
        this.inspectionService = inspectionService;
        this.modalElement = null;
        this.initializeModal();
    }

    initializeModal() {
        // Create modal element if it doesn't exist
        if (!document.getElementById('detailModal')) {
            this.createModalElement();
        }
        this.modalElement = new bootstrap.Modal(document.getElementById('detailModal'));
    }

    createModalElement() {
        const modalHTML = `
        <div class="modal fade" id="detailModal" tabindex="-1" aria-labelledby="detailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="detailModalLabel">
                            <i class="bi bi-info-circle"></i> Detail Hasil Pemeriksaan APAR
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="detailLoading" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2">Memuat data pemeriksaan...</p>
                        </div>
                        <div id="detailContent" style="display: none;">
                            <!-- APAR Information -->
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-fire"></i> Informasi APAR</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row" id="aparInfoContent">
                                        <!-- APAR info will be populated here -->
                                    </div>
                                </div>
                            </div>

                            <!-- Latest Inspection -->
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-clipboard-check"></i> Pemeriksaan Terakhir</h6>
                                </div>
                                <div class="card-body">
                                    <div id="latestInspectionContent">
                                        <!-- Latest inspection will be populated here -->
                                    </div>
                                </div>
                            </div>

                            <!-- Inspection History -->
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-clock-history"></i> Riwayat Pemeriksaan</h6>
                                </div>
                                <div class="card-body">
                                    <div id="inspectionHistoryContent" style="max-height: 400px; overflow-y: auto;">
                                        <!-- Inspection history will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="detailError" class="alert alert-danger text-center" style="display: none;">
                            <i class="bi bi-exclamation-triangle"></i>
                            <span id="detailErrorMessage">Gagal memuat data pemeriksaan</span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async showDetailByQRCode(qrCode) {
        try {
            this.showLoading(true);
            this.hideError();

            // Validate QR Code
            if (!qrCode || qrCode.trim() === '') {
                throw new Error('QR Code tidak valid');
            }

            // Extract QR Code from URL if it's a full URL
            const extractedQRCode = this.extractQRCodeFromURL(qrCode);
            const finalQRCode = extractedQRCode || qrCode;

            console.log('Loading detail for QR Code:', finalQRCode);

            // Load APAR data
            const aparData = await this.dataService.fetchAPARData(finalQRCode);
            if (!aparData) {
                throw new Error(`Data APAR dengan QR Code ${finalQRCode} tidak ditemukan`);
            }

            // Load inspection history
            await this.dataService.loadInspectionHistory();
            const inspections = this.inspectionService.getInspectionHistory(finalQRCode);

            // Render the data
            this.renderDetailContent(aparData, inspections, finalQRCode);
            
            // Show modal
            this.modalElement.show();

        } catch (error) {
            console.error('Error showing detail modal:', error);
            this.showError(`Gagal memuat data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    extractQRCodeFromURL(url) {
        try {
            // Handle various URL formats
            if (url.includes('/')) {
                const parts = url.split('/');
                return parts[parts.length - 1]; // Get the last part
            }
            return url;
        } catch (error) {
            console.error('Error extracting QR Code from URL:', error);
            return url;
        }
    }

    renderDetailContent(aparData, inspections, qrCode) {
        // Render APAR information
        this.renderAPARInfo(aparData, qrCode);

        // Render latest inspection
        this.renderLatestInspection(inspections);

        // Render inspection history
        this.renderInspectionHistory(inspections);

        this.showContent();
    }

    renderAPARInfo(aparData, qrCode) {
        const aparInfoContent = document.getElementById('aparInfoContent');
        if (!aparInfoContent) return;

        const status = this.inspectionService.getLastInspectionStatus(qrCode);

        aparInfoContent.innerHTML = `
            <div class="col-md-6">
                <table class="table table-sm table-borderless">
                    <tr>
                        <td><strong>QR Code:</strong></td>
                        <td>${qrCode}</td>
                    </tr>
                    <tr>
                        <td><strong>Lokasi:</strong></td>
                        <td>${aparData.Lokasi || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Jenis:</strong></td>
                        <td>${aparData.Jenis || '-'}</td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <table class="table table-sm table-borderless">
                    <tr>
                        <td><strong>Kapasitas:</strong></td>
                        <td>${aparData.Kapasitas || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Expired:</strong></td>
                        <td>${aparData.Expired || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Status:</strong></td>
                        <td>${status.badge}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    renderLatestInspection(inspections) {
        const latestInspectionContent = document.getElementById('latestInspectionContent');
        if (!latestInspectionContent) return;

        if (inspections.length === 0) {
            latestInspectionContent.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                    <p class="mt-2">Belum ada riwayat pemeriksaan</p>
                </div>
            `;
            return;
        }

        const latestInspection = inspections[0]; // Most recent inspection
        const isExpired = new Date(latestInspection.expired) < new Date();

        latestInspectionContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Tanggal Pemeriksaan:</strong><br>${latestInspection.date}</p>
                    <p><strong>Pemeriksa:</strong><br>${latestInspection.inspector}</p>
                    <p><strong>Tanggal Expired:</strong><br>${latestInspection.expired}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Status Keseluruhan:</strong><br>
                        <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
                            ${isExpired ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
                        </span>
                    </p>
                    <p><strong>Kondisi Komponen:</strong></p>
                    <div class="component-status-list">
                        ${this.renderComponentStatus(latestInspection)}
                    </div>
                </div>
            </div>
            ${latestInspection.notes ? `
            <div class="mt-3 p-3 bg-light rounded">
                <strong>Keterangan:</strong>
                <p class="mb-0">${latestInspection.notes}</p>
            </div>
            ` : ''}
        `;
    }

    renderComponentStatus(inspection) {
        const components = [
            { name: 'Segel/Pin', value: inspection.seal },
            { name: 'Handle/Tuas', value: inspection.handle },
            { name: 'Tabung', value: inspection.tank },
            { name: 'Label/Stiker', value: inspection.label },
            { name: 'Selang/Hose', value: inspection.hose },
            { name: 'Nozzle/Corong', value: inspection.nozzle },
            { name: 'Manometer', value: inspection.gauge },
            { name: 'Bracket/Dudukan', value: inspection.bracket },
            { name: 'Rambu/Tanda', value: inspection.sign }
        ];

        return components.map(component => {
            let badgeClass = 'bg-secondary';
            let statusText = 'Tidak Ada';

            if (component.value === 'baik') {
                badgeClass = 'bg-success';
                statusText = 'Baik';
            } else if (component.value === 'tidak-baik') {
                badgeClass = 'bg-danger';
                statusText = 'Tidak Baik';
            } else if (component.value === 'tidak-ada') {
                badgeClass = 'bg-secondary';
                statusText = 'Tidak Ada';
            }

            return `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span>${component.name}:</span>
                    <span class="badge ${badgeClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    }

    renderInspectionHistory(inspections) {
        const inspectionHistoryContent = document.getElementById('inspectionHistoryContent');
        if (!inspectionHistoryContent) return;

        if (inspections.length === 0) {
            inspectionHistoryContent.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                    <p class="mt-2">Belum ada riwayat pemeriksaan</p>
                </div>
            `;
            return;
        }

        let html = '';
        inspections.forEach((inspection, index) => {
            const isExpired = new Date(inspection.expired) < new Date();
            const status = this.calculateInspectionStatus(inspection);

            html += `
                <div class="card mb-2 ${index === 0 ? 'border-primary' : ''}">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${inspection.date}</h6>
                            <span class="badge ${status.badgeClass}">${status.text}</span>
                        </div>
                        <p class="card-text mb-1"><small>Oleh: ${inspection.inspector}</small></p>
                        <p class="card-text mb-1"><small>Expired: ${inspection.expired}</small></p>
                        <p class="card-text mb-0">
                            <small class="${isExpired ? 'text-danger' : 'text-success'}">
                                ${isExpired ? 'Telah Kadaluarsa' : 'Masih Berlaku'}
                            </small>
                        </p>
                    </div>
                </div>
            `;
        });

        inspectionHistoryContent.innerHTML = html;
    }

    calculateInspectionStatus(inspection) {
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

    showLoading(show) {
        const loadingElement = document.getElementById('detailLoading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    showContent() {
        const contentElement = document.getElementById('detailContent');
        if (contentElement) {
            contentElement.style.display = 'block';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('detailError');
        const errorMessageElement = document.getElementById('detailErrorMessage');
        
        if (errorElement && errorMessageElement) {
            errorMessageElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    hideError() {
        const errorElement = document.getElementById('detailError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Method to handle URL-based QR Code detection
    handleURLQRCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const qrCode = urlParams.get('qrcode');
        
        if (qrCode) {
            // Auto-show modal when QR Code is provided in URL
            setTimeout(() => {
                this.showDetailByQRCode(qrCode);
            }, 1000);
        }
    }
}
