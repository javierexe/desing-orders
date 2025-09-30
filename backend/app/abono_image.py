import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from .supabase_storage import get_supabase_storage

# Mantener directorio local como fallback
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '../uploads/comprobantes')
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

@router.post("/upload-abono-image")
def upload_abono_image(file: UploadFile = File(...)):
    print(f"🔄 UPLOAD REQUEST: {file.filename}, {file.content_type}")
    
    # Validar tipo de archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
    
    # Leer contenido del archivo
    contents = file.file.read()
    
    # Limitar tamaño (ejemplo: 5MB para Supabase)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB)")
    
    try:
        # Intentar subir a Supabase primero
        storage = get_supabase_storage()
        public_url, storage_key = storage.upload_file(
            file_content=contents,
            filename=file.filename or "receipt.jpg",
            content_type=file.content_type
        )
        
        return {
            "url": public_url,
            "storage_key": storage_key,
            "storage_provider": "supabase"
        }
        
    except Exception as e:
        print(f"Supabase upload failed, falling back to local storage: {e}")
        
        # Fallback a almacenamiento local
        filename = (file.filename or "receipt.jpg").replace(" ", "_")
        path = os.path.join(UPLOAD_DIR, filename)
        
        with open(path, "wb") as f:
            f.write(contents)
        
        return {
            "url": f"/uploads/comprobantes/{filename}",
            "storage_key": None,
            "storage_provider": "local"
        }

@router.get("/uploads/comprobantes/{filename}")
def get_abono_image(filename: str):
    """Endpoint para servir imágenes almacenadas localmente (fallback)"""
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return FileResponse(path)
