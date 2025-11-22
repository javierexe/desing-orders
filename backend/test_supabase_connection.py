"""
Script para verificar la conexión y configuración de Supabase
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

def test_supabase():
    print("🔍 Verificando configuración de Supabase...\n")
    
    # 1. Verificar variables de entorno
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    bucket = os.getenv("SUPABASE_BUCKET", "order-receipts")
    
    print("📋 Variables de entorno:")
    print(f"   SUPABASE_URL: {url[:30]}... (len={len(url) if url else 0})" if url else "   SUPABASE_URL: ❌ NO CONFIGURADO")
    print(f"   SUPABASE_ANON_KEY: {key[:30]}... (len={len(key) if key else 0})" if key else "   SUPABASE_ANON_KEY: ❌ NO CONFIGURADO")
    print(f"   SUPABASE_BUCKET: {bucket}")
    print()
    
    if not url or not key:
        print("❌ Error: Faltan variables de entorno")
        return False
    
    # 2. Intentar crear cliente de Supabase
    try:
        from supabase import create_client
        print("📦 Importando supabase... ✅")
        
        client = create_client(url, key)
        print("🔗 Cliente Supabase creado... ✅")
        print()
        
    except ImportError as e:
        print(f"❌ Error: No se puede importar supabase: {e}")
        print("   Instala con: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Error creando cliente: {e}")
        return False
    
    # 3. Verificar acceso al bucket
    try:
        print(f"🪣 Verificando bucket '{bucket}'...")
        
        # Listar buckets disponibles
        buckets = client.storage.list_buckets()
        print(f"   Buckets disponibles: {[b.name for b in buckets]}")
        
        # Verificar si existe el bucket específico
        bucket_exists = any(b.name == bucket for b in buckets)
        if bucket_exists:
            print(f"   ✅ Bucket '{bucket}' encontrado")
        else:
            print(f"   ❌ Bucket '{bucket}' NO existe")
            print(f"   💡 Necesitas crear el bucket en Supabase Dashboard:")
            print(f"      1. Ve a: {url}/project/_/storage/buckets")
            print(f"      2. Crea un bucket llamado '{bucket}'")
            print(f"      3. Configura como público si quieres URLs públicas")
            return False
        
        print()
        
    except Exception as e:
        print(f"   ❌ Error accediendo al bucket: {e}")
        return False
    
    # 4. Intentar subir un archivo de prueba
    try:
        print("📤 Probando subida de archivo...")
        
        test_content = b"Test file from verification script"
        test_filename = "test/verification.txt"
        
        result = client.storage.from_(bucket).upload(
            path=test_filename,
            file=test_content,
            file_options={"content-type": "text/plain", "upsert": "true"}
        )
        
        print(f"   ✅ Archivo de prueba subido: {test_filename}")
        
        # Obtener URL pública
        public_url = client.storage.from_(bucket).get_public_url(test_filename)
        print(f"   🔗 URL pública: {public_url[:60]}...")
        
        # Eliminar archivo de prueba
        client.storage.from_(bucket).remove([test_filename])
        print(f"   🗑️  Archivo de prueba eliminado")
        print()
        
    except Exception as e:
        print(f"   ❌ Error en prueba de subida: {e}")
        print(f"   💡 Verifica los permisos del bucket en Supabase")
        return False
    
    print("=" * 60)
    print("✅ Supabase está configurado y funcionando correctamente")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        success = test_supabase()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
