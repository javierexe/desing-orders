import os
import uuid
from supabase import create_client, Client
from fastapi import HTTPException
from typing import Optional
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class SupabaseStorage:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables"
            )
        
        self.client: Client = create_client(self.url, self.key)
        self.bucket_name = os.getenv("SUPABASE_BUCKET", "order-receipts")  # Bucket en Supabase (ver Copilot instructions)

    def upload_file(self, file_content: bytes, filename: str, content_type: str, order_code: str = None, amount: int = None) -> tuple[str, str]:
        """
        Sube un archivo a Supabase Storage con nombre descriptivo
        Returns: (public_url, storage_key)
        
        Args:
            file_content: Contenido del archivo
            filename: Nombre original del archivo
            content_type: Tipo MIME
            order_code: Código de la orden (ej: OT-123) - opcional
            amount: Monto del abono en pesos - opcional
        """
        try:
            # Generar nombre descriptivo
            file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
            
            # Construir nombre: {orden}_{monto}_{timestamp}_{uuid}.ext
            # Ejemplo: OT-123_50000_20231008_abc123.jpg
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            short_uuid = str(uuid.uuid4())[:8]  # Solo los primeros 8 caracteres del UUID
            
            if order_code and amount is not None:
                # Formato: OT-123_50000CLP_20231008_143022_abc123.jpg
                unique_filename = f"{order_code}_{amount}CLP_{timestamp}_{short_uuid}.{file_extension}"
            elif order_code:
                # Formato: OT-123_20231008_143022_abc123.jpg
                unique_filename = f"{order_code}_{timestamp}_{short_uuid}.{file_extension}"
            else:
                # Fallback: solo timestamp y uuid (para casos sin metadata)
                unique_filename = f"comprobante_{timestamp}_{short_uuid}.{file_extension}"
            
            storage_path = f"comprobantes/{unique_filename}"
            
            # Subir archivo
            response = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": content_type}
            )
            
            # La nueva versión de supabase-py retorna directamente el resultado
            if response:
                # Obtener URL pública
                public_url = self.client.storage.from_(self.bucket_name).get_public_url(storage_path)
                # Limpiar caracteres extra al final de la URL
                if public_url.endswith('?'):
                    public_url = public_url[:-1]
                return public_url, storage_path
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error uploading file: Upload failed"
                )
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading to Supabase: {str(e)}")

    def delete_file(self, storage_key: str) -> bool:
        """
        Elimina un archivo de Supabase Storage
        """
        try:
            response = self.client.storage.from_(self.bucket_name).remove([storage_key])
            return response.data is not None
        except Exception as e:
            print(f"Error deleting file from Supabase: {e}")
            return False

# Instancia global
supabase_storage = None

def get_supabase_storage() -> SupabaseStorage:
    global supabase_storage
    if supabase_storage is None:
        supabase_storage = SupabaseStorage()
    return supabase_storage