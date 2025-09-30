#!/usr/bin/env python3
import os
import sys
sys.path.append('/Users/javier/repos/desing-orders/backend')

from app.supabase_storage import get_supabase_storage
from dotenv import load_dotenv

load_dotenv('/Users/javier/repos/desing-orders/backend/.env')

def test_supabase_config():
    print("🔍 Testing Supabase Storage Configuration...")
    
    try:
        storage = get_supabase_storage()
        print(f"✅ Supabase client initialized")
        print(f"🪣 Bucket name: {storage.bucket_name}")
        print(f"🌐 Supabase URL: {storage.url}")
        
        # Intentar listar buckets disponibles
        try:
            response = storage.client.storage.list_buckets()
            print(f"📋 Available buckets: {[b.name for b in response]}")
            
            # Verificar si nuestro bucket existe
            if storage.bucket_name in [b.name for b in response]:
                print(f"✅ Bucket '{storage.bucket_name}' exists")
            else:
                print(f"❌ Bucket '{storage.bucket_name}' NOT FOUND")
                print("💡 Available buckets:")
                for bucket in response:
                    print(f"   - {bucket.name}")
        
        except Exception as e:
            print(f"❌ Error listing buckets: {e}")
            
    except Exception as e:
        print(f"❌ Error initializing Supabase: {e}")

if __name__ == "__main__":
    test_supabase_config()