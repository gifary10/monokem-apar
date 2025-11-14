export const CONFIG = {
  // URL untuk data master APAR dan riwayat pemeriksaan (code1.gs)
  scriptURL: 'https://script.google.com/macros/s/AKfycbzPlt2aiGy6xi1L7vZ6_P7X8wO69Nmp_h8xhw9vT_PmGAl133Ht-rHqfNBz38LxWK34/exec',
  
  // URL untuk menyimpan data inspeksi (code2.gs)
  inspectionSheetURL: 'https://script.google.com/macros/s/AKfycbwx26SEsNP_dxbt0949Sv5WCdotrGtuFW2FIXTZaXA8lSHOuKUSGTurp7avuglZQSQi/exec',
  
  defaultDate: new Date().toISOString().split('T')[0]
};
