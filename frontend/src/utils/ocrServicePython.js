/**
 * Servicio OCR Python Backend - Reemplaza el mock
 * Conecta con el endpoint /ocr/detect-amount del backend
 */

import { api } from '../lib/api';

/**
 * Extrae texto y detecta montos usando OCR Python en el backend
 * @param {File} file - Archivo de imagen
 * @returns {Promise<Object>} Resultado del OCR
 */
export async function extractTextFromImage(file) {
  try {
    console.log('🐍 [OCR Python] Iniciando análisis...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    // Crear FormData para enviar la imagen
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📡 [OCR Python] Enviando a /ocr/detect-amount...');
    
    // Llamar al endpoint OCR del backend
    const response = await api.post('/ocr/detect-amount', formData, {
      timeout: 30000, // 30 segundos
    });
    
    console.log('📨 [OCR Python] Respuesta completa:', response);
    
    // La respuesta puede estar directamente en response o en response.data
    const result = response?.data || response;
    console.log('📊 [OCR Python] Datos extraídos:', result);
    
    // Si OCR no está disponible, devolver respuesta que permita fallback
    if (!result || !result.success) {
      console.log('⚠️ [OCR Python] OCR no disponible, permitiendo fallback frontend');
      return {
        success: false, // Indica que debe usar fallback
        text: result?.extracted_text || '',
        confidence: 0.0,
        error: result?.error || 'OCR no disponible',
        // Datos vacíos para que AmountDetection use su parser frontend
        mostLikelyAmount: null,
        detectedAmounts: []
      };
    }
    
    console.log('✅ OCR Python exitoso:', {
      amounts: result.amounts_detected,
      confidence: result.confidence,
      mostLikely: result.most_likely_amount
    });
    
    // Transformar respuesta al formato esperado por AmountDetection
    return {
      success: true,
      text: result.extracted_text,
      detectedAmounts: result.amounts || [],
      mostLikelyAmount: result.most_likely_amount ? {
        amount: result.most_likely_amount.amount,
        formatted: result.most_likely_amount.formatted,
        confidence: result.most_likely_amount.confidence,
        context: result.most_likely_amount.raw_text
      } : null,
      confidence: result.confidence || 0,
      engine: 'Python + Tesseract',
      debug: {
        filename: result.filename,
        textLength: result.extracted_text?.length || 0,
        amountsFound: result.amounts_detected || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error OCR Python:', error);
    
    // Manejar errores específicos
    if (error.response?.status === 400) {
      throw new Error('Formato de imagen no válido. Use JPEG, PNG o similar.');
    } else if (error.response?.status === 413) {
      throw new Error('Imagen demasiado grande. Máximo 10MB.');
    } else if (error.response?.status === 503) {
      throw new Error('Servicio OCR temporalmente no disponible. El sistema está configurándose. Inténtelo nuevamente en unos minutos.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout: El OCR está tardando demasiado. Intente con una imagen más pequeña.');
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error('Error conectando con el servicio OCR. Verifique que el backend esté funcionando.');
    }
  }
}

/**
 * Verifica el estado del servicio OCR
 * @returns {Promise<Object>} Estado del OCR
 */
export async function checkOCRStatus() {
  try {
    const response = await api.get('/ocr/ocr-status');
    return response.data;
  } catch (error) {
    console.error('Error verificando estado OCR:', error);
    return {
      ocr_available: false,
      status: 'ERROR',
      message: 'No se pudo conectar con el servicio OCR'
    };
  }
}

/**
 * Prueba detallada del OCR (para debugging)
 * @param {File} file - Archivo de imagen  
 * @returns {Promise<Object>} Resultado detallado
 */
export async function testOCRDetailed(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/ocr/test-ocr', formData, {
      timeout: 30000,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en test OCR:', error);
    throw error;
  }
}

export default {
  extractTextFromImage,
  checkOCRStatus,
  testOCRDetailed
};