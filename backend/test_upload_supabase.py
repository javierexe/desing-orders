#!/usr/bin/env python3
"""
Script para probar la subida de un archivo de prueba a Supabase
"""
import os
import sys
sys.path.append('/Users/javier/repos/desing-orders/backend')

from app.supabase_storage import get_supabase_storage
from dotenv import load_dotenv

load_dotenv('/Users/javier/repos/desing-orders/backend/.env')

def test_upload():
    print("🔍 Probando subida a Supabase Storage...")
    
    try:
        storage = get_supabase_storage()
        print(f"✅ Storage inicializado")
        print(f"🪣 Bucket: {storage.bucket_name}")
        print(f"🌐 URL: {storage.url}")
        print()
        
        # Crear un archivo de prueba (imagen de 1x1 pixel PNG)
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        print("📤 Subiendo imagen de prueba...")
        public_url, storage_key = storage.upload_file(
            file_content=test_image,
            filename="test_upload.png",
            content_type="image/png"
        )
        
        print(f"✅ ¡Subida exitosa!")
        print(f"📍 URL pública: {public_url}")
        print(f"🔑 Storage key: {storage_key}")
        print()
        print("🎉 La configuración de Supabase está funcionando correctamente")
        print()
        
        # Preguntar si eliminar el archivo de prueba
        print("¿Deseas eliminar el archivo de prueba? (s/n)")
        response = input().strip().lower()
        
        if response == 's':
            print("🗑️  Eliminando archivo de prueba...")
            if storage.delete_file(storage_key):
                print("✅ Archivo eliminado")
            else:
                print("⚠️  No se pudo eliminar (puede que no exista o no tengas permisos)")
        
    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
        print(f"   Tipo de error: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        print()
        print("💡 Posibles causas:")
        print("   1. El bucket 'receipts' no existe en Supabase")
        print("   2. Las credenciales son incorrectas")
        print("   3. El bucket no es público")
        print("   4. No tienes permisos de escritura")

if __name__ == "__main__":
    test_upload()
