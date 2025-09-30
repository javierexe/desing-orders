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
      this.worker = await Tesseract.createWorker({
        logger: m => console.log(m) // Para debugging
      });

      await this.worker.loadLanguage('spa+eng');
      await this.worker.initialize('spa+eng');
      
      // Configurar parámetros para mejor detección de números
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789$.,',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });

      this.isInitialized = true;
      console.log('OCR Service initialized successfully');
    } catch (error) {
      console.error('Error initializing OCR:', error);
      throw new Error('Failed to initialize OCR service');
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
      await this.initialize();

      console.log('Starting OCR analysis...');
      
      // Crear elemento imagen para preprocesamiento
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageFile);
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Preprocesar imagen
            const processedCanvas = this.preprocessImage(img);
            
            // Ejecutar OCR
            const { data: { text, confidence } } = await this.worker.recognize(processedCanvas);
            
            console.log('OCR Text extracted:', text);
            console.log('OCR Confidence:', confidence);
            
            // Limpiar URL
            URL.revokeObjectURL(imageUrl);
            
            resolve({
              text: text.trim(),
              confidence,
              success: true
            });
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
      });
      
    } catch (error) {
      console.error('Error extracting text:', error);
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