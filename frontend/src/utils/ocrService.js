import Tesseract from 'tesseract.js';

/**
 * Servicio OCR para detectar texto en imágenes usando Tesseract.js
 */
class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el worker de Tesseract
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing OCR service...');
      
      // Crear worker con configuración simplificada
      this.worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Cargar idiomas
      console.log('Loading languages...');
      await this.worker.loadLanguage('spa+eng');
      
      console.log('Initializing languages...');
      await this.worker.initialize('spa+eng');
      
      this.isInitialized = true;
      console.log('OCR Service initialized successfully');
    } catch (error) {
      console.error('Error initializing OCR:', error);
      this.isInitialized = false;
      throw new Error(`Failed to initialize OCR service: ${error.message}`);
    }
  }

  /**
   * Preprocesa la imagen para mejorar la calidad del OCR
   */
  preprocessImage(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageElement.width || imageElement.naturalWidth;
    canvas.height = imageElement.height || imageElement.naturalHeight;
    
    // Dibujar imagen original
    ctx.drawImage(imageElement, 0, 0);
    
    // Aumentar contraste y convertir a escala de grises
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convertir a escala de grises
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      
      // Aumentar contraste
      const contrast = 1.5;
      const adjustedGray = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
      
      data[i] = adjustedGray;     // R
      data[i + 1] = adjustedGray; // G
      data[i + 2] = adjustedGray; // B
      // Alpha channel stays the same
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Extrae texto de una imagen
   */
  async extractText(imageFile) {
    try {
      console.log('Starting OCR analysis for file:', imageFile.name || 'pasted image');
      
      // Reinicializar worker si es necesario
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Verificar que el archivo sea válido
      if (!imageFile || imageFile.size === 0) {
        throw new Error('Invalid image file');
      }

      // Crear una imagen para verificar que se puede cargar
      const imageUrl = URL.createObjectURL(imageFile);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async () => {
          try {
            console.log('Image loaded successfully, starting OCR...');
            
            // Ejecutar OCR directamente con el archivo (sin preprocesamiento por ahora)
            const { data: { text, confidence } } = await this.worker.recognize(imageFile);
            
            console.log('OCR completed successfully');
            console.log('Text extracted:', text);
            console.log('Confidence:', confidence);
            
            // Limpiar URL
            URL.revokeObjectURL(imageUrl);
            
            resolve({
              text: text.trim(),
              confidence,
              success: true
            });
          } catch (error) {
            console.error('OCR processing error:', error);
            URL.revokeObjectURL(imageUrl);
            resolve({
              text: '',
              confidence: 0,
              success: false,
              error: error.message
            });
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image');
          URL.revokeObjectURL(imageUrl);
          resolve({
            text: '',
            confidence: 0,
            success: false,
            error: 'Failed to load image'
          });
        };
        
        img.src = imageUrl;
      });
      
    } catch (error) {
      console.error('Error in extractText:', error);
      return {
        text: '',
        confidence: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpia los recursos del worker
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR Service cleaned up');
    }
  }
}

// Instancia singleton
const ocrService = new OCRService();

export default ocrService;