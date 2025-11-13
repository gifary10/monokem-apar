// Buat file baru js/error-handler.js
export class ErrorHandler {
  static handle(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Tampilkan alert ke user
    if (typeof showAlert === 'function') {
      showAlert(`Terjadi kesalahan: ${error.message}`, 'danger');
    }
    
    // Log ke console untuk debugging
    return null;
  }
  
  static setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
}