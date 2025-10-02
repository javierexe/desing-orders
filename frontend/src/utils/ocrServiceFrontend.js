/**
 * Servicio OCR usando Tesseract.js en el frontend
 * Solución sin dependencias de backend
 */

import Tesseract from 'tesseract.js';

/**
 * Configuración del worker OCR
 */
const OCR_CONFIG = {
  logger: m => {
    if (m.status === 'recognizing text') {
      console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
    }
  },
  // Configurar idiomas para Chile
  lang: 'eng+spa',
  // Optimizaciones para números y montos
  tessedit_char_whitelist: '0123456789$.,- ',
  preserve_interword_spaces: '1',
};

/**
 * Detectar y extraer montos de una imagen usando OCR frontend
 * @param {File} imageFile - Archivo de imagen
 * @returns {Promise<Object>} Resultado del OCR con montos detectados
 */
export async function extractTextFromImage(imageFile) {
  try {
    console.log('🎯 [OCR Frontend] Iniciando análisis...', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    });

    // Validar archivo
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Crear URL para la imagen
    const imageUrl = URL.createObjectURL(imageFile);

    try {
      // Ejecutar OCR
      console.log('🔍 [OCR Frontend] Procesando imagen...');
      const { data: { text, confidence } } = await Tesseract.recognize(
        imageUrl,
        OCR_CONFIG.lang,
        {
          logger: OCR_CONFIG.logger,
          tessedit_char_whitelist: OCR_CONFIG.tessedit_char_whitelist,
          preserve_interword_spaces: OCR_CONFIG.preserve_interword_spaces,
        }
      );

      console.log('📝 [OCR Frontend] Texto extraído:', text);
      console.log('📊 [OCR Frontend] Confianza:', confidence);

      // Limpiar URL
      URL.revokeObjectURL(imageUrl);

      // Detectar montos en el texto
      const detectedAmounts = detectChileanAmounts(text);
      console.log('💰 [OCR Frontend] Montos detectados:', detectedAmounts);

      // Encontrar el monto más probable
      const mostLikelyAmount = findMostLikelyAmount(detectedAmounts, text);

      const result = {
        success: true,
        text: text,
        confidence: confidence / 100, // Convertir a decimal
        detectedAmounts: detectedAmounts,
        mostLikelyAmount: mostLikelyAmount,
        source: 'frontend-ocr'
      };

      console.log('✅ [OCR Frontend] Resultado final:', result);
      return result;

    } catch (ocrError) {
      // Limpiar URL en caso de error
      URL.revokeObjectURL(imageUrl);
      throw ocrError;
    }

  } catch (error) {
    console.error('❌ [OCR Frontend] Error:', error);
    throw new Error(`Error en OCR frontend: ${error.message}`);
  }
}

/**
 * Detectar montos chilenos en texto
 * @param {string} text - Texto extraído por OCR
 * @returns {Array} Array de montos detectados
 */
function detectChileanAmounts(text) {
  const amounts = [];
  
  // Patrones para montos chilenos
  const patterns = [
    // $66.000, $1.500.000
    /\$\s*(\d{1,3}(?:\.\d{3})*)/g,
    // 66000, 1500000 (números grandes probables)
    /\b(\d{4,})\b/g,
    // 66,000 (formato americano que a veces aparece)
    /\$?\s*(\d{1,3}(?:,\d{3})*)/g,
  ];

  patterns.forEach((pattern, patternIndex) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawAmount = match[1].replace(/[.,]/g, '');
      const numericValue = parseInt(rawAmount, 10);
      
      // Filtrar montos válidos (entre $1.000 y $100.000.000)
      if (numericValue >= 1000 && numericValue <= 100000000) {
        amounts.push({
          amount: numericValue,
          formatted: formatChileanPesos(numericValue),
          raw: match[0],
          confidence: calculateAmountConfidence(match[0], text, patternIndex),
          context: getAmountContext(text, match.index, match[0].length)
        });
      }
    }
  });

  // Eliminar duplicados y ordenar por confianza
  const uniqueAmounts = deduplicateAmounts(amounts);
  return uniqueAmounts.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Formatear número a pesos chilenos
 */
function formatChileanPesos(amount) {
  return `$${amount.toLocaleString('es-CL')}`;
}

/**
 * Calcular confianza del monto basado en contexto
 */
function calculateAmountConfidence(amountText, fullText, patternIndex) {
  let confidence = 0.5; // Base

  // Bonus por patrón
  if (patternIndex === 0) confidence += 0.3; // Formato $XX.XXX
  if (patternIndex === 1) confidence += 0.1; // Números grandes
  if (patternIndex === 2) confidence += 0.2; // Formato con comas

  // Bonus por contexto
  const lowerText = fullText.toLowerCase();
  if (lowerText.includes('total')) confidence += 0.2;
  if (lowerText.includes('monto')) confidence += 0.2;
  if (lowerText.includes('pago')) confidence += 0.1;
  if (lowerText.includes('precio')) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

/**
 * Obtener contexto alrededor del monto
 */
function getAmountContext(text, startIndex, length) {
  const contextRadius = 30;
  const start = Math.max(0, startIndex - contextRadius);
  const end = Math.min(text.length, startIndex + length + contextRadius);
  return text.substring(start, end).trim();
}

/**
 * Eliminar montos duplicados
 */
function deduplicateAmounts(amounts) {
  const seen = new Set();
  return amounts.filter(amount => {
    if (seen.has(amount.amount)) {
      return false;
    }
    seen.add(amount.amount);
    return true;
  });
}

/**
 * Encontrar el monto más probable
 */
function findMostLikelyAmount(amounts, text) {
  if (amounts.length === 0) return null;
  
  // Si solo hay uno, ese es
  if (amounts.length === 1) return amounts[0];
  
  // Tomar el de mayor confianza
  return amounts[0];
}

/**
 * Verificar si OCR está disponible
 */
export async function checkOCRStatus() {
  try {
    // Tesseract.js siempre está disponible en frontend
    return {
      ocr_available: true,
      status: 'READY',
      message: 'OCR Frontend disponible (Tesseract.js)',
      source: 'frontend'
    };
  } catch (error) {
    return {
      ocr_available: false,
      status: 'ERROR',
      message: `Error en OCR Frontend: ${error.message}`,
      source: 'frontend'
    };
  }
}

// Exportar funciones principales
export default {
  extractTextFromImage,
  checkOCRStatus
};