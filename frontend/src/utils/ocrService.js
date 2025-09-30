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
      
      // Crear worker con configuración más específica
      this.worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        workerPath: 'https://unpkg.com/tesseract.js@4.1.1/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://unpkg.com/tesseract.js-core@4.0.3/tesseract-core.wasm.js',
        errorHandler: err => console.error('Tesseract Worker Error:', err)
      });

      // Cargar idiomas
      console.log('Loading languages...');
      await this.worker.loadLanguage('spa+eng');
      
      console.log('Initializing languages...');
      await this.worker.initialize('spa+eng');
      
      // Configurar parámetros específicos para números después de la inicialización
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789$.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
        tessedit_pageseg_mode: '6' // Uniform block of text
      });
      
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

      // Convertir el archivo a una URL de datos para evitar problemas de clonación
      const imageDataUrl = await this.fileToDataUrl(imageFile);
      
      console.log('Image converted to data URL, starting OCR...');
      
      // Ejecutar OCR con la URL de datos
      const { data: { text, confidence } } = await this.worker.recognize(imageDataUrl);
      
      console.log('OCR completed successfully');
      console.log('Text extracted:', text);
      console.log('Confidence:', confidence);
      
      return {
        text: text.trim(),
        confidence,
        success: true
      };
      
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
   * Convierte un archivo a data URL
   */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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