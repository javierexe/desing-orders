#!/usr/bin/env python3
"""
Script para verificar y crear el bucket necesario en Supabase Storage
"""
import os
import sys
sys.path.append('/Users/javier/repos/desing-orders/backend')

from supabase import create_client
from dotenv import load_dotenv

load_dotenv('/Users/javier/repos/desing-orders/backend/.env')

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    bucket_name = os.getenv("SUPABASE_BUCKET", "order-receipts")
    
    if not url or not key:
        print("❌ SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados")
        sys.exit(1)
    
    print(f"🔍 Conectando a Supabase...")
    print(f"🌐 URL: {url}")
    print(f"🪣 Bucket deseado: {bucket_name}")
    print()
    
    client = create_client(url, key)
    
    # Listar buckets existentes
    print("📋 Listando buckets existentes...")
    try:
        buckets = client.storage.list_buckets()
        if buckets:
            print(f"✅ Buckets encontrados: {len(buckets)}")
            for bucket in buckets:
                print(f"   - {bucket.name} (id: {bucket.id}, público: {bucket.public})")
        else:
            print("⚠️  No se encontraron buckets")
    except Exception as e:
        print(f"❌ Error listando buckets: {e}")
        print(f"   Tipo de error: {type(e).__name__}")
        import traceback
        traceback.print_exc()
    
    print()
    print(f"🔧 ¿Deseas crear el bucket '{bucket_name}'? (s/n)")
    response = input().strip().lower()
    
    if response == 's':
        try:
            print(f"📦 Creando bucket '{bucket_name}'...")
            result = client.storage.create_bucket(
                bucket_name,
                options={
                    "public": True,  # Bucket público para URLs accesibles
                    "file_size_limit": 5242880,  # 5MB
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/jpg", "image/webp"]
                }
            )
            print(f"✅ Bucket '{bucket_name}' creado exitosamente!")
            print(f"   Resultado: {result}")
        except Exception as e:
            print(f"❌ Error creando bucket: {e}")
            print(f"   Tipo de error: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            
            if "already exists" in str(e).lower():
                print("💡 El bucket ya existe, todo debería estar funcionando")
    else:
        print("❌ Operación cancelada")

if __name__ == "__main__":
    main()
