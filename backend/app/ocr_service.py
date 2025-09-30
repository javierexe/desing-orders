"""
Servicio OCR Python usando Tesseract para detección de montos en comprobantes chilenos
"""
import pytesseract
import cv2
import numpy as np
from PIL import Image
import re
import logging
from typing import Optional, Tuple, Dict, Any
import tempfile
import os

logger = logging.getLogger(__name__)

def preprocess_image(image_path: str) -> str:
    """
    Preprocesa la imagen para mejorar la precisión del OCR
    """
    try:
        # Leer imagen con OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"No se pudo cargar la imagen: {image_path}")
        
        # Convertir a escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Aplicar filtro gaussiano para reducir ruido
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Aplicar threshold adaptativo para binarizar
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Operaciones morfológicas para limpiar la imagen
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Redimensionar imagen si es muy pequeña (mejora OCR)
        height, width = cleaned.shape
        if height < 300 or width < 300:
            scale_factor = max(300 / height, 300 / width)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            cleaned = cv2.resize(cleaned, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Guardar imagen procesada temporalmente
        temp_path = tempfile.mktemp(suffix='.png')
        cv2.imwrite(temp_path, cleaned)
        
        return temp_path
        
    except Exception as e:
        logger.error(f"Error preprocesando imagen: {e}")
        return image_path  # Retornar imagen original si falla el preprocesamiento

def detect_chilean_amounts(text: str) -> list:
    """
    Detecta montos en formato chileno del texto extraído
    """
    # Patrones para montos chilenos
    patterns = [
        # $123.456 - $1.234.567
        r'\$\s*(?:(?:\d{1,3}\.)*\d{3})',
        # 123.456 - 1.234.567 (sin símbolo $)
        r'(?<!\d)(?:\d{1,3}\.)*\d{3}(?!\d)',
        # $123456 (sin puntos)
        r'\$\s*\d+',
        # Formatos alternativos con "pesos"
        r'(?:\d{1,3}\.)*\d{3}\s*pesos?',
        # Total: $123.456
        r'total\s*:?\s*\$?\s*(?:\d{1,3}\.)*\d{3}',
        # Cancelado: $123.456  
        r'cancelado\s*:?\s*\$?\s*(?:\d{1,3}\.)*\d{3}',
        # Abonado: $123.456
        r'abonado\s*:?\s*\$?\s*(?:\d{1,3}\.)*\d{3}',
    ]
    
    amounts = []
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            raw_amount = match.group()
            
            # Extraer solo los dígitos
            digits_only = re.sub(r'[^\d]', '', raw_amount)
            
            if digits_only and len(digits_only) >= 3:  # Al menos 3 dígitos
                try:
                    amount_int = int(digits_only)
                    # Filtrar montos muy pequeños o muy grandes
                    if 1000 <= amount_int <= 100000000:  # Entre $1.000 y $100.000.000
                        amounts.append({
                            'raw_text': raw_amount.strip(),
                            'amount': amount_int,
                            'formatted': format_chilean_amount(amount_int),
                            'confidence': calculate_confidence(raw_amount, text),
                            'position': match.span()
                        })
                except ValueError:
                    continue
    
    # Ordenar por confianza descendente
    amounts.sort(key=lambda x: x['confidence'], reverse=True)
    
    return amounts

def calculate_confidence(amount_text: str, full_text: str) -> float:
    """
    Calcula la confianza de un monto detectado basado en contexto
    """
    confidence = 0.5  # Base confidence
    
    amount_lower = amount_text.lower()
    text_lower = full_text.lower()
    
    # Incrementar confianza por contexto
    context_keywords = {
        'total': 0.3,
        'cancelado': 0.25,
        'abonado': 0.25,
        'pagado': 0.2,
        'monto': 0.2,
        'precio': 0.2,
        '$': 0.15,
        'pesos': 0.15,
    }
    
    for keyword, boost in context_keywords.items():
        if keyword in amount_lower or keyword in text_lower:
            confidence += boost
    
    # Penalizar montos muy pequeños o muy grandes
    digits = re.sub(r'[^\d]', '', amount_text)
    if digits:
        amount_value = int(digits)
        if amount_value < 5000:  # Menos de $5.000
            confidence -= 0.2
        elif amount_value > 10000000:  # Más de $10.000.000
            confidence -= 0.3
        elif 10000 <= amount_value <= 1000000:  # Rango típico $10.000 - $1.000.000
            confidence += 0.1
    
    # Incrementar si tiene formato con puntos separadores
    if '.' in amount_text and '$' in amount_text:
        confidence += 0.1
    
    return min(confidence, 1.0)  # Máximo 1.0

def format_chilean_amount(amount: int) -> str:
    """
    Formatea un monto en formato chileno
    """
    return f"${amount:,}".replace(',', '.')

def extract_text_from_image(image_path: str) -> Dict[str, Any]:
    """
    Extrae texto de una imagen y detecta montos chilenos
    """
    try:
        # Preprocesar imagen
        processed_path = preprocess_image(image_path)
        
        # Configuración optimizada para Tesseract
        config = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,: '
        
        # Extraer texto
        text = pytesseract.image_to_string(
            processed_path,
            config=config,
            lang='eng'  # Usando inglés para mejor compatibilidad
        )
        
        # Limpiar archivo temporal si se creó
        if processed_path != image_path and os.path.exists(processed_path):
            os.unlink(processed_path)
        
        # Detectar montos
        amounts = detect_chilean_amounts(text)
        
        logger.info(f"OCR extraído: {len(text)} caracteres, {len(amounts)} montos detectados")
        
        return {
            'success': True,
            'text': text.strip(),
            'amounts': amounts,
            'most_likely_amount': amounts[0] if amounts else None,
            'confidence': amounts[0]['confidence'] if amounts else 0.0
        }
        
    except Exception as e:
        logger.error(f"Error en OCR: {e}")
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'amounts': [],
            'most_likely_amount': None,
            'confidence': 0.0
        }

def test_ocr_installation() -> bool:
    """
    Prueba que Tesseract esté instalado y funcionando
    """
    try:
        # Crear imagen de prueba simple
        test_img = Image.new('RGB', (200, 100), color='white')
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            test_img.save(tmp.name)
            
            # Intentar OCR
            text = pytesseract.image_to_string(tmp.name)
            
            # Limpiar
            os.unlink(tmp.name)
            
        return True
        
    except Exception as e:
        logger.error(f"Error probando OCR: {e}")
        return False

# Ejemplo de uso y pruebas
if __name__ == "__main__":
    # Test básico
    if test_ocr_installation():
        print("✅ Tesseract instalado y funcionando correctamente")
    else:
        print("❌ Error con la instalación de Tesseract")