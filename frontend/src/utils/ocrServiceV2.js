/**
 * Servicio OCR alternativo usando approach más simple para evitar DataCloneError
 */

let tesseractWorker = null;
let isInitializing = false;

/**
 * Inicializa el worker de Tesseract de forma lazy
 */
async function initializeWorker() {
  if (tesseractWorker) return tesseractWorker;
  if (isInitializing) {
    // Esperar a que termine la inicialización
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return tesseractWorker;
  }

  try {
    isInitializing = true;
    console.log('🔧 Initializing Tesseract worker...');

    // Usar la API más simple de Tesseract
    const { createWorker } = await import('tesseract.js');
    
    tesseractWorker = await createWorker({
      logger: m => {
        if (m.status === 'recognizing text' && m.progress) {
          console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    await tesseractWorker.loadLanguage('spa+eng');
    await tesseractWorker.initialize('spa+eng');
    
    console.log('✅ Tesseract worker initialized successfully');
    return tesseractWorker;
    
  } catch (error) {
    console.error('❌ Failed to initialize Tesseract worker:', error);
    tesseractWorker = null;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Convierte imagen a formato Canvas para evitar problemas de transferencia
 */
function imageToCanvas(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = imageElement.naturalWidth || imageElement.width;
  canvas.height = imageElement.naturalHeight || imageElement.height;
  
  ctx.drawImage(imageElement, 0, 0);
  return canvas;
}

/**
 * Extrae texto de una imagen usando OCR
 */
export async function extractTextFromImage(imageFile) {
  try {
    console.log('🔍 Starting OCR analysis...');
    
    // Inicializar worker
    const worker = await initializeWorker();
    
    // Convertir archivo a imagen
    const imageUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = async () => {
        try {
          // Crear canvas desde imagen para evitar problemas de transferencia
          const canvas = imageToCanvas(img);
          
          console.log('📷 Image prepared, starting OCR recognition...');
          
          // Ejecutar OCR en el canvas
          const { data: { text, confidence } } = await worker.recognize(canvas);
          
          console.log('📝 OCR completed');
          console.log('📄 Text extracted:', text.substring(0, 200) + '...');
          console.log('📊 Confidence:', Math.round(confidence) + '%');
          
          resolve({
            success: true,
            text: text.trim(),
            confidence: Math.round(confidence)
          });
          
        } catch (error) {
          console.error('❌ OCR recognition failed:', error);
          resolve({
            success: false,
            error: error.message,
            text: '',
            confidence: 0
          });
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      };
      
      img.onerror = () => {
        console.error('❌ Failed to load image');
        URL.revokeObjectURL(imageUrl);
        resolve({
          success: false,
          error: 'Failed to load image',
          text: '',
          confidence: 0
        });
      };
      
      img.src = imageUrl;
    });
    
  } catch (error) {
    console.error('❌ OCR service error:', error);
    return {
      success: false,
      error: error.message,
      text: '',
      confidence: 0
    };
  }
}

/**
 * Limpia recursos del worker
 */
export async function cleanupWorker() {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
      console.log('🧹 Tesseract worker terminated');
    } catch (error) {
      console.error('❌ Error terminating worker:', error);
    }
    tesseractWorker = null;
  }
}

// Cleanup automático al cerrar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupWorker);
}