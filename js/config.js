export const CONFIG = {
  // URL untuk data master APAR dan riwayat pemeriksaan (code1.gs)
  scriptURL: 'https://script.google.com/macros/s/AKfycbwnuPxLD0yw9Y7u8phaDSBnlSmH_KCbrsBLHUMPSYrk9vOuHBBuQwWVbHTBkFDhMn6F/exec',
  
  // URL untuk menyimpan data inspeksi (code2.gs)
  inspectionSheetURL: 'https://script.google.com/macros/s/AKfycbybZYBwE9r6BJbscqP-d3XZ2baRbhOT_JfHYmoFgayqV9Zsc-_josMNnguY4LZ2bPZV/exec',
  
  defaultDate: new Date().toISOString().split('T')[0],
  
  // Konfigurasi untuk data master APAR
  aparSheetId: '18usF1zfMJZh0ZBsWribR4uvFYGjQAbM_3Y4up6xM7us',
  aparSheetName: 'Data',
  
  // Konfigurasi untuk data riwayat pemeriksaan
  inspectionSheetId: '18usF1zfMJZh0ZBsWribR4uvFYGjQAbM_3Y4up6xM7us',
  inspectionHistorySheetName: 'Rekap'
};