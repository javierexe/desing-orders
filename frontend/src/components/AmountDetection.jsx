import React, { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { extractTextFromImage } from '../utils/ocrServiceFrontend'; // OCR Frontend con Tesseract.js
import { detectMostLikelyAmount, formatChileanAmount } from '../utils/amountParser';

/**
 * Componente para detección automática de montos en comprobantes
 */
const AmountDetection = ({ 
  file, 
  items = [],
  selectedItemId,
  onItemSelected,
  onAmountDetected, 
  onCancel,
  onSkipFile, // Nueva prop para omitir archivo sin subir
  isVisible = true 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Iniciar análisis automáticamente al montar el componente
  useEffect(() => {
    if (file && isVisible && !hasStarted && !isAnalyzing) {
      console.log('🚀 AmountDetection: Auto-starting analysis');
      startAnalysis();
    }
  }, [file, isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Inicia el análisis OCR del archivo
   */
  const startAnalysis = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setHasStarted(true);

    try {
      console.log('🎯 AmountDetection: Starting analysis for:', file.name || 'pasted image');
      
      // Timeout para evitar que se cuelgue indefinidamente
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Análisis OCR timeout (45s)')), 45000);
      });

      // Extraer texto usando OCR con timeout
      const ocrResult = await Promise.race([
        extractTextFromImage(file),
        timeoutPromise
      ]);
      
      console.log('🔍 AmountDetection: OCR result:', ocrResult);
      
      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'Error en análisis OCR');
      }

      // **🔧 FIX: Usar directamente los resultados del backend OCR Python (ya procesados correctamente)**
      console.log('🧠 AmountDetection: Backend OCR result:', ocrResult);
      
      let amountResult = null;
      
      // Si el backend OCR Python detectó un monto, usarlo directamente (ya está en pesos)
      if (ocrResult.mostLikelyAmount && ocrResult.mostLikelyAmount.amount) {
        amountResult = {
          amount: ocrResult.mostLikelyAmount.amount, // Ya está en pesos (ej: 66000)
          formatted: ocrResult.mostLikelyAmount.formatted, // Ya formateado (ej: "$66.000")
          confidence: ocrResult.mostLikelyAmount.confidence,
          context: ocrResult.mostLikelyAmount.context,
          detectedAmounts: ocrResult.detectedAmounts || []
        };
        console.log('✅ AmountDetection: Using backend detection:', amountResult);
      } else {
        // Fallback: usar parser frontend solo si backend no detectó nada
        console.log('⚠️ AmountDetection: Backend no detectó montos, usando fallback frontend...');
        amountResult = detectMostLikelyAmount(ocrResult.text);
        console.log('🔄 AmountDetection: Frontend fallback result:', amountResult);
      }
      
      setDetectionResult({
        ...amountResult,
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence
      });

    } catch (err) {
      console.error('❌ AmountDetection: Error in analysis:', err);
      setError(err.message || 'Error al analizar la imagen');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Confirma el monto detectado
   */
  const confirmAmount = () => {
    if (!selectedItemId) {
      alert('Por favor selecciona un item para vincular este comprobante');
      return;
    }
    
    if (detectionResult?.amount) {
      onAmountDetected(detectionResult.amount, selectedItemId);
    }
  };

  /**
   * Rechaza el resultado y permite entrada manual
   */
  const rejectAmount = () => {
    // Solo limpiar resultado, NO cerrar componente
    setDetectionResult(null);
    setError(null);
    setHasStarted(false);
    // Llamar onAmountDetected con null para limpiar cualquier monto anterior
    if (onAmountDetected) {
      onAmountDetected(null, selectedItemId);
    }
  };

  /**
   * Obtener clases CSS según nivel de confianza
   */
  const getConfidenceStyles = (confidence) => {
    const percent = (confidence || 0) * 100;
    
    if (percent >= 80) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-600',
        titleText: 'text-green-800',
        amountText: 'text-green-700',
        icon: 'text-green-600'
      };
    } else if (percent >= 60) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200', 
        text: 'text-yellow-600',
        titleText: 'text-yellow-800',
        amountText: 'text-yellow-700',
        icon: 'text-yellow-600'
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600', 
        titleText: 'text-red-800',
        amountText: 'text-red-700',
        icon: 'text-red-600'
      };
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Detección Automática de Monto
            <span className="text-xs text-green-600 ml-2 font-normal">
              (OCR Frontend)
            </span>
          </h3>
        </div>
        
        {!hasStarted && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Estado inicial */}
      {!hasStarted && !isAnalyzing && (
        <div className="text-center py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-600 mb-1">🎭 <strong>Modo Demo:</strong> Usando simulación OCR</p>
            <p className="text-xs text-blue-500">Detectará automáticamente montos de tus comprobantes reales</p>
          </div>
          <p className="text-gray-600 mb-4">
            ¿Detectar automáticamente el monto del comprobante?
          </p>
          <div className="flex space-x-3 justify-center">
            <button
              type="button"
              onClick={startAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Analizar Imagen</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ingresar Manual
            </button>
            {onSkipFile && (
              <button
                type="button"
                onClick={onSkipFile}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                Omitir archivo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Estado analizando */}
      {isAnalyzing && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Analizando comprobante...</p>
          <p className="text-sm text-gray-500 mt-1">
            Esto puede tomar unos segundos
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="text-red-800 font-medium">Error en detección</h4>
          </div>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={startAnalysis}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={rejectAmount}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              Entrada Manual
            </button>
          </div>
        </div>
      )}

      {/* Resultado exitoso */}
      {detectionResult && !error && (
        <div className="space-y-4">
          {detectionResult.amount ? (
            (() => {
              const styles = getConfidenceStyles(detectionResult.confidence);
              return (
                <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className={`w-5 h-5 ${styles.icon}`} />
                    <h4 className={`${styles.titleText} font-medium`}>Monto detectado</h4>
                  </div>
                  
                  <div className="text-center mb-4">
                    <div className={`text-3xl font-bold ${styles.amountText} mb-1`}>
                      {formatChileanAmount(detectionResult.amount)}
                    </div>
                    <div className={`text-sm ${styles.text}`}>
                      Confianza: {Math.round((detectionResult.confidence || 0) * 100)}%
                    </div>
                  </div>

                  {/* Contexto del monto - OCULTO */}
                  {/* Contexto detectado se oculta por solicitud del usuario */}

              {/* Selección de item */}
              <div className="bg-white border border-green-200 rounded p-3 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿A qué item corresponde este abono?
                </label>
                <select
                  value={selectedItemId || ''}
                  onChange={(e) => onItemSelected(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Selecciona un item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description || item.name || `Item ${items.indexOf(item) + 1}`} - ${(item.price || 0).toLocaleString('es-CL')}
                      {item.paid_amount > 0 && ` (Abonado: $${item.paid_amount.toLocaleString('es-CL')})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones de acción */}
              <div className="flex space-x-3 justify-center">
                <button
                  type="button"
                  onClick={confirmAmount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Usar este monto</span>
                </button>
                <button
                  type="button"
                  onClick={rejectAmount}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Corregir manualmente
                </button>
              </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <XCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="text-yellow-800 font-medium">No se detectó monto</h4>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                No se pudo detectar un monto claro en la imagen.
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={startAnalysis}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition-colors"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={rejectAmount}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  Entrada Manual
                </button>
              </div>
            </div>
          )}

          {/* Detalles técnicos (colapsible) */}
          {detectionResult.ocrText && (
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showDetails ? 'Ocultar' : 'Ver'} detalles técnicos</span>
              </button>
              
              {showDetails && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-600 mb-2">
                    <strong>Texto OCR completo:</strong>
                  </div>
                  <div className="text-xs text-gray-800 bg-white border rounded p-2 max-h-32 overflow-y-auto font-mono">
                    {detectionResult.ocrText}
                  </div>
                  
                  {detectionResult.allMatches && detectionResult.allMatches.length > 1 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Otros montos detectados:</strong>
                      </div>
                      <div className="space-y-1">
                        {detectionResult.allMatches.slice(1, 4).map((match, index) => (
                          <div key={index} className="text-xs text-gray-700 bg-white border rounded p-2">
                            {formatChileanAmount(match.amount)} (Score: {match.score})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AmountDetection;