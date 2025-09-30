"""
Router para detección de montos usando OCR Python
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
import logging
from .ocr_service import extract_text_from_image, test_ocr_installation

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/detect-amount")
async def detect_amount_endpoint(file: UploadFile = File(...)):
    """
    Endpoint para detectar montos en imágenes usando OCR Python
    """
    try:
        # Validar tipo de archivo
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser una imagen (JPEG, PNG, etc.)"
            )
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            # Leer y guardar contenido
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            
            # Procesar con OCR
            result = extract_text_from_image(tmp_file.name)
            
            # Limpiar archivo temporal
            os.unlink(tmp_file.name)
            
            # Respuesta exitosa
            return JSONResponse(
                status_code=200,
                content={
                    'success': result['success'],
                    'filename': file.filename,
                    'extracted_text': result['text'][:500],  # Primeros 500 caracteres
                    'amounts_detected': len(result['amounts']),
                    'amounts': result['amounts'][:5],  # Top 5 montos
                    'most_likely_amount': result['most_likely_amount'],
                    'confidence': result['confidence'],
                    'error': result.get('error')
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en detect_amount_endpoint: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}',
                'filename': file.filename if file else 'unknown'
            }
        )

@router.get("/ocr-status")
async def ocr_status():
    """
    Verifica el estado del servicio OCR
    """
    try:
        is_working = test_ocr_installation()
        
        return JSONResponse(
            status_code=200,
            content={
                'ocr_available': is_working,
                'engine': 'Tesseract + Python',
                'status': 'OK' if is_working else 'ERROR',
                'message': 'OCR funcionando correctamente' if is_working else 'Error con Tesseract'
            }
        )
        
    except Exception as e:
        logger.error(f"Error verificando OCR: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'ocr_available': False,
                'engine': 'Tesseract + Python',
                'status': 'ERROR',
                'message': f'Error: {str(e)}'
            }
        )

@router.post("/test-ocr")
async def test_ocr_with_image(file: UploadFile = File(...)):
    """
    Endpoint de prueba para OCR con información detallada
    """
    try:
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            
            # Procesar con OCR
            result = extract_text_from_image(tmp_file.name)
            
            # Limpiar archivo temporal
            os.unlink(tmp_file.name)
            
            return JSONResponse(
                status_code=200,
                content={
                    'success': result['success'],
                    'filename': file.filename,
                    'full_text': result['text'],  # Texto completo para debug
                    'text_length': len(result['text']),
                    'amounts_detected': len(result['amounts']),
                    'all_amounts': result['amounts'],  # Todos los montos
                    'most_likely': result['most_likely_amount'],
                    'confidence': result['confidence'],
                    'error': result.get('error'),
                    'debug_info': {
                        'file_size': len(content),
                        'content_type': file.content_type
                    }
                }
            )
            
    except Exception as e:
        logger.error(f"Error en test_ocr_with_image: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e),
                'filename': file.filename if file else 'unknown'
            }
        )