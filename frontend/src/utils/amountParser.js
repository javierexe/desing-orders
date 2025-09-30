/**
 * Utilidades para parsear y detectar montos en texto chileno
 */

/**
 * Patrones comunes para montos chilenos
 */
const AMOUNT_PATTERNS = [
  // Patrón principal: $XX.XXX o $X.XXX.XXX
  /\$\s*(\d{1,3}(?:\.\d{3})*)/g,
  
  // Patrón para "monto" seguido de número
  /monto\s*[:\$]?\s*(\d{1,3}(?:\.\d{3})*)/gi,
  
  // Patrón alternativo: XXX.XXX sin símbolo (pero con contexto)
  /(?:transferido|pagado|abono|deposito|total|suma)\s*[:\$]?\s*(\d{1,3}(?:\.\d{3})+)/gi,
  
  // Patrón para montos con comas como separador decimal
  /\$\s*(\d{1,3}(?:\.\d{3})*),\d{2}/g,
  
  // Patrón simple para números grandes (como última opción)
  /(\d{4,})/g
];

/**
 * Palabras clave que indican montos en español
 */
const AMOUNT_KEYWORDS = [
  'monto',
  'transferido',
  'depositado',
  'pago',
  'suma',
  'total',
  'valor',
  'cantidad',
  'abono',
  'deposito'
];

/**
 * Convierte texto de monto chileno a número
 * Ej: "$15.000" -> 15000, "5.000" -> 5000
 */
export function parseChileanAmount(amountText) {
  if (!amountText || typeof amountText !== 'string') {
    return null;
  }

  // Limpiar el texto
  let cleanText = amountText
    .replace(/\$/g, '') // Remover símbolo de peso
    .replace(/\s+/g, '') // Remover espacios
    .trim();

  // Si tiene puntos como separadores de miles (formato chileno)
  if (cleanText.includes('.') && !cleanText.includes(',')) {
    // Verificar si es formato de miles (ej: 15.000)
    const parts = cleanText.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // Es formato de miles
      cleanText = cleanText.replace(/\./g, '');
    } else if (parts.length > 2) {
      // Múltiples puntos, son separadores de miles
      cleanText = cleanText.replace(/\./g, '');
    }
  }

  // Convertir a número
  const number = parseInt(cleanText, 10);
  
  // Validar que sea un número válido y razonable
  if (isNaN(number) || number <= 0 || number > 100000000) {
    return null;
  }

  return number;
}

/**
 * Detecta montos en texto OCR
 */
export function detectAmounts(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const foundAmounts = [];
  const textLower = text.toLowerCase();

  // Buscar con cada patrón
  AMOUNT_PATTERNS.forEach((pattern, patternIndex) => {
    const matches = [...text.matchAll(pattern)];
    
    matches.forEach(match => {
      const fullMatch = match[0];
      const amountText = match[1] || fullMatch;
      const parsedAmount = parseChileanAmount(amountText);
      
      if (parsedAmount) {
        // Buscar contexto alrededor del match
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + fullMatch.length + 50);
        const context = text.substring(contextStart, contextEnd);
        
        // Calcular score basado en contexto y keywords
        const score = calculateAmountScore(context, parsedAmount, patternIndex);
        
        foundAmounts.push({
          amount: parsedAmount,
          originalText: fullMatch,
          context: context.trim(),
          score,
          position: matchIndex
        });
      }
    });
  });

  // Ordenar por score (mayor a menor) y remover duplicados
  const uniqueAmounts = removeDuplicateAmounts(foundAmounts);
  return uniqueAmounts.sort((a, b) => b.score - a.score);
}

/**
 * Calcula un score para un monto detectado basado en contexto
 */
function calculateAmountScore(context, amount, patternIndex) {
  let score = 0;
  const contextLower = context.toLowerCase();

  // Score base según patrón usado
  const patternScores = [15, 20, 18, 12, 3]; // Prioridad de patrones (monto con contexto tiene más peso)
  score += patternScores[patternIndex] || 5;

  // Bonus por keywords relevantes
  AMOUNT_KEYWORDS.forEach(keyword => {
    if (contextLower.includes(keyword)) {
      score += 15;
    }
  });

  // Bonus extra por contexto específico de transferencias
  if (contextLower.includes('transferido') || contextLower.includes('transferencia')) {
    score += 10;
  }

  // Bonus por formato típico chileno
  if (amount >= 1000 && amount % 1000 === 0) {
    score += 5; // Montos redondos en miles
  }

  // Bonus por rango típico de transferencias (1.000 - 10.000.000)
  if (amount >= 1000 && amount <= 10000000) {
    score += 10;
  }

  // Penalty por montos muy pequeños o muy grandes
  if (amount < 100 || amount > 50000000) {
    score -= 15;
  }

  // Penalty extra por números que parecen códigos (muy largos o muy cortos)
  if (amount < 1000 || amount > 20000000) {
    score -= 10;
  }

  return Math.max(0, score);
}

/**
 * Remueve montos duplicados o muy similares
 */
function removeDuplicateAmounts(amounts) {
  const unique = [];
  
  amounts.forEach(current => {
    const isDuplicate = unique.some(existing => {
      // Mismo monto exacto
      if (existing.amount === current.amount) {
        return true;
      }
      
      // Montos muy similares (diferencia menor al 5%)
      const difference = Math.abs(existing.amount - current.amount);
      const average = (existing.amount + current.amount) / 2;
      const percentDiff = (difference / average) * 100;
      
      return percentDiff < 5;
    });
    
    if (!isDuplicate) {
      unique.push(current);
    }
  });
  
  return unique;
}

/**
 * Formatea un monto como texto chileno
 */
export function formatChileanAmount(amount) {
  if (!amount || isNaN(amount)) {
    return '';
  }
  
  return `$${amount.toLocaleString('es-CL')}`;
}

/**
 * Función principal para detectar el monto más probable
 */
export function detectMostLikelyAmount(text) {
  const amounts = detectAmounts(text);
  
  if (amounts.length === 0) {
    return null;
  }

  // Retornar el monto con mayor score
  const bestMatch = amounts[0];
  
  return {
    amount: bestMatch.amount,
    confidence: Math.min(100, bestMatch.score * 3), // Convertir score a porcentaje
    context: bestMatch.context,
    allMatches: amounts
  };
}