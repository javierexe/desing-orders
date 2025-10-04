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
    
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith("image/"):
            print(f"❌ Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
        
        # Leer contenido del archivo
        print("📖 Reading file contents...")
        contents = file.file.read()
        print(f"📏 File size: {len(contents)} bytes")
        
        # Limitar tamaño (ejemplo: 5MB para Supabase)
        if len(contents) > 5 * 1024 * 1024:
            print(f"❌ File too large: {len(contents)} bytes")
            raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB)")
        
        try:
            # Intentar subir a Supabase primero
            print("☁️ Attempting Supabase upload...")
            storage = get_supabase_storage()
            public_url, storage_key = storage.upload_file(
                file_content=contents,
                filename=file.filename or "receipt.jpg",
                content_type=file.content_type
            )
            
            print(f"✅ Supabase upload successful: {public_url}")
            return {
                "url": public_url,
                "storage_key": storage_key,
                "storage_provider": "supabase"
            }
            
        except Exception as e:
            print(f"❌ Supabase upload failed: {type(e).__name__}: {e}")
            print("💾 Falling back to local storage...")
            
            # Fallback a almacenamiento local
            filename = (file.filename or "receipt.jpg").replace(" ", "_")
            path = os.path.join(UPLOAD_DIR, filename)
            
            print(f"📁 Saving to local path: {path}")
            with open(path, "wb") as f:
                f.write(contents)
            
            print(f"✅ Local storage successful: {path}")
            return {
                "url": f"/uploads/comprobantes/{filename}",
                "storage_key": None,
                "storage_provider": "local"
            }
    
    except HTTPException as e:
        print(f"❌ HTTP Exception: {e.status_code} - {e.detail}")
        raise e
    except Exception as e:
        print(f"❌ Unexpected error in upload: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/uploads/comprobantes/{filename}")
def get_abono_image(filename: str):
    """
    Endpoint para servir imágenes almacenadas localmente (fallback para desarrollo)
    
    IMPORTANTE: En producción, las imágenes DEBEN estar en Supabase Storage.
    Este endpoint solo funciona para archivos guardados localmente durante desarrollo.
    """
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        print(f"⚠️ Archivo no encontrado localmente: {filename}")
        print(f"💡 Consejo: Este archivo debería estar en Supabase Storage, no local")
        raise HTTPException(
            status_code=404, 
            detail="Imagen no encontrada. Si estás en producción, asegúrate de que las imágenes se suban a Supabase Storage."
        )
    return FileResponse(path)
