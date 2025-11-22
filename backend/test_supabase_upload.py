"""
Script simplificado para probar subida directa a Supabase
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

def test_upload():
    print("🔍 Probando subida directa a Supabase...\n")
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    bucket = os.getenv("SUPABASE_BUCKET", "receipts")
    
    print(f"📋 Usando bucket: {bucket}")
    
    try:
        from supabase import create_client
        client = create_client(url, key)
        print("✅ Cliente creado\n")
        
        # Intentar subir archivo directamente
        print("📤 Intentando subida...")
        test_content = b"Test file from direct upload"
        test_filename = f"test/verification_{os.urandom(4).hex()}.txt"
        
        result = client.storage.from_(bucket).upload(
            path=test_filename,
            file=test_content,
            file_options={"content-type": "text/plain", "upsert": "true"}
        )
        
        print(f"✅ Subida exitosa: {test_filename}")
        print(f"📦 Resultado: {result}")
        
        # Obtener URL pública
        public_url = client.storage.from_(bucket).get_public_url(test_filename)
        print(f"\n🔗 URL pública: {public_url}")
        
        # Intentar eliminar
        try:
            client.storage.from_(bucket).remove([test_filename])
            print(f"✅ Archivo eliminado correctamente\n")
        except Exception as e:
            print(f"⚠️  No se pudo eliminar (pero la subida funcionó): {e}\n")
        
        print("=" * 60)
        print("✅ Supabase funciona correctamente")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"💡 Verifica:")
        print(f"   1. Que el bucket '{bucket}' exista")
        print(f"   2. Que tenga permisos de escritura")
        print(f"   3. Que la ANON_KEY tenga los permisos correctos")
        return False

if __name__ == "__main__":
    success = test_upload()
    sys.exit(0 if success else 1)
