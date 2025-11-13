export function createHistoryItem(inspection, index) {
  const historyItem = document.createElement('div');
  historyItem.className = 'card history-item mb-3';
  
  const today = new Date();
  const expiredDate = new Date(inspection.expired);
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
    statusClass = 'status-bad';
  } else if (hasBadStatus) {
    overallStatus = 'Perlu Perbaikan';
    statusClass = 'status-bad';
  } else {
    overallStatus = 'Baik';
    statusClass = 'status-good';
  }
  
  const expiredFormatted = new Date(inspection.expired).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  historyItem.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="card-title mb-0">Pemeriksaan ${inspection.date}</h6>
        <div>
          <span class="badge badge-status ${statusClass}">${overallStatus}</span>
          ${inspection.inspector ? `<small class="text-muted ms-2">Oleh: ${inspection.inspector}</small>` : ''}
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <p class="mb-1"><strong>Tanggal Expired:</strong> ${expiredFormatted} ${isExpired ? '<span class="text-danger">(Kadaluarsa)</span>' : '<span class="text-success">(Masih Berlaku)</span>'}</p>
          <p class="mb-1"><strong>Segel/Pin:</strong> ${getStatusBadge(inspection.seal)}</p>
          <p class="mb-1"><strong>Handle/Tuas:</strong> ${getStatusBadge(inspection.handle)}</p>
          <p class="mb-1"><strong>Tabung:</strong> ${getStatusBadge(inspection.tank)}</p>
          <p class="mb-1"><strong>Label/Stiker:</strong> ${getStatusBadge(inspection.label)}</p>
        </div>
        <div class="col-md-6">
          <p class="mb-1"><strong>Selang/Hose:</strong> ${getStatusBadge(inspection.hose)}</p>
          <p class="mb-1"><strong>Nozzle/Corong:</strong> ${getStatusBadge(inspection.nozzle)}</p>
          <p class="mb-1"><strong>Manometer:</strong> ${getGaugeStatus(inspection.gauge)}</p>
          <p class="mb-1"><strong>Bracket/Dudukan:</strong> ${getStatusBadge(inspection.bracket)}</p>
          <p class="mb-1"><strong>Rambu/Tanda:</strong> ${getStatusBadge(inspection.sign)}</p>
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

function getStatusBadge(value) {
  return value === 'baik' 
    ? '<span class="text-success">✓ Baik</span>' 
    : '<span class="text-danger">✗ Tidak Baik</span>';
}

function getGaugeStatus(value) {
  if (value === 'baik') return '<span class="text-success">✓ Baik</span>';
  if (value === 'tidak-baik') return '<span class="text-danger">✗ Tidak Baik</span>';
  return '<span class="text-muted">Tidak Ada</span>';
}