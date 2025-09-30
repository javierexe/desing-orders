/**
 * Servicio OCR Mock/Simulado para testing y desarrollo
 * 
 * Este servicio simula la funcionalidad OCR sin usar Tesseract.js
 * para evitar problemas de DataCloneError y poder probar la UI/UX
 */

// Simulación de textos OCR basados en tus comprobantes reales
const MOCK_OCR_RESULTS = [
  {
    trigger: 'transferencia',
    text: `Operación exitosa
    Monto Transferido
    $66.000
    Para Dworld Chile Spa
    N° de cuenta Cta Cte N.° ****7304
    Desde Mi Cuenta Corriente
    N° de cuenta N° ****3171
    Mensaje
    45 llaveros pixar`,
    confidence: 95
  },
  {
    trigger: 'comprobante',
    text: `Comprobante de Transferencia
    Monto $15.000
    Mensaje Stiker
    Destinatario
    Nombre Dworld Chile Spa
    RUT 78.066.537-8
    Banco Banco De Chile
    Cuenta Cuenta Corriente 2711097304`,
    confidence: 98
  },
  {
    trigger: 'deposito',
    text: `CajaVecina
    DEPOSITO EN EFECTIVO
    A CUENTA RUT
    ANA JEREZ
    AVDA LIBER BERNARDO O HIGGINS 797
    000000000018902
    MONTO $8.000
    COD.AUTORIZACION 172719
    N.TRANSACCION 212719`,
    confidence: 87
  },
  {
    trigger: 'default',
    text: `Comprobante de Transferencia
    Monto $5.000
    Destinatario
    Nombre Worldchilespa
    RUT 78.066.537-8
    Banco Banco De Chile
    Cuenta Cuenta Corriente 2711097304`,
    confidence: 92
  }
];

/**
 * Simula el análisis de una imagen
 */
function simulateImageAnalysis(fileName = '') {
  return new Promise((resolve) => {
    // Simular delay de procesamiento real
    const processingTime = Math.random() * 3000 + 1500; // 1.5-4.5 segundos
    
    console.log('🎭 Mock OCR: Simulating image analysis...');
    console.log(`📄 File: ${fileName}`);
    
    // Determinar qué resultado mock usar basado en el nombre del archivo
    let mockResult;
    const fileNameLower = fileName.toLowerCase();
    
    if (fileNameLower.includes('transferencia') || fileNameLower.includes('66000')) {
      mockResult = MOCK_OCR_RESULTS[0];
    } else if (fileNameLower.includes('15000') || fileNameLower.includes('stiker')) {
      mockResult = MOCK_OCR_RESULTS[1];
    } else if (fileNameLower.includes('deposito') || fileNameLower.includes('8000') || fileNameLower.includes('caja')) {
      mockResult = MOCK_OCR_RESULTS[2];
    } else {
      // Alternar entre resultados para variedad
      const randomIndex = Math.floor(Math.random() * MOCK_OCR_RESULTS.length);
      mockResult = MOCK_OCR_RESULTS[randomIndex];
    }
    
    setTimeout(() => {
      console.log('✅ Mock OCR: Analysis completed');
      console.log('📝 Extracted text preview:', mockResult.text.substring(0, 50) + '...');
      console.log('📊 Confidence:', mockResult.confidence + '%');
      
      resolve({
        success: true,
        text: mockResult.text,
        confidence: mockResult.confidence
      });
    }, processingTime);
  });
}

/**
 * Simula la extracción de texto de una imagen
 */
export async function extractTextFromImage(imageFile) {
  try {
    console.log('🎯 Mock OCR Service: Starting analysis');
    console.log('📷 Image file:', imageFile.name || 'pasted image');
    console.log('📐 File size:', Math.round(imageFile.size / 1024) + 'KB');
    
    // Validar que sea un archivo de imagen
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }
    
    // Simular análisis
    const result = await simulateImageAnalysis(imageFile.name || 'pasted_image');
    
    return result;
    
  } catch (error) {
    console.error('❌ Mock OCR Error:', error);
    return {
      success: false,
      error: error.message,
      text: '',
      confidence: 0
    };
  }
}

/**
 * Cleanup (no necesario para mock, pero mantiene la API)
 */
export async function cleanupWorker() {
  console.log('🧹 Mock OCR: Cleanup completed (no resources to free)');
}

// Logging de inicialización
console.log('🎭 Mock OCR Service loaded - This is a simulation for testing purposes');
console.log('📋 Available mock scenarios:', MOCK_OCR_RESULTS.length);