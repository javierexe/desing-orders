from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
from .supabase_storage import get_supabase_storage

router = APIRouter()

@router.post("/upload-abono-image")
def upload_abono_image(
    file: UploadFile = File(...),
    order_code: Optional[str] = Form(None),
    amount: Optional[int] = Form(None)
):
    """
    Sube un comprobante de abono a Supabase Storage.
    
    Si Supabase no está disponible o falla, el endpoint retorna error 500.
    NO hay fallback a almacenamiento local para mantener consistencia en producción.
    """
    print(f"\n{'='*80}")
    print(f"🔄 UPLOAD REQUEST: {file.filename}, {file.content_type}")
    print(f"{'='*80}\n")
    
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith("image/"):
            print(f"❌ Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
        
        # Leer contenido del archivo
        print("📖 Reading file contents...")
        contents = file.file.read()
        print(f"📏 File size: {len(contents)} bytes")
        
        # Limitar tamaño (5MB máximo para Supabase)
        if len(contents) > 5 * 1024 * 1024:
            print(f"❌ File too large: {len(contents)} bytes")
            raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB)")
        
        # Subir a Supabase (sin fallback)
        print("☁️ Uploading to Supabase Storage...")
        if order_code:
            print(f"   📦 Order: {order_code}")
        if amount is not None:
            print(f"   💰 Amount: ${amount:,} CLP")
        storage = get_supabase_storage()
        print(f"   🪣 Bucket name: {storage.bucket_name}")
        public_url, storage_key = storage.upload_file(
            file_content=contents,
            filename=file.filename or "receipt.jpg",
            content_type=file.content_type,
            order_code=order_code,
            amount=amount
        )
        
        print(f"✅ Supabase upload successful!")
        print(f"   📍 URL: {public_url}")
        print(f"   🔑 Storage key: {storage_key}")
        print(f"\n{'='*80}\n")
        
        return {
            "url": public_url,
            "storage_key": storage_key,
            "storage_provider": "supabase"
        }
    
    except HTTPException:
        # Re-lanzar HTTPExceptions tal cual (400, etc.)
        raise
    except Exception as e:
        # Cualquier error de Supabase o inesperado se convierte en 500
        print(f"❌ Upload failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al subir comprobante a Supabase Storage: {str(e)}. Verifica las credenciales y que el bucket 'order-receipts' exista."
        )
