#!/usr/bin/env python3
"""
Script para verificar que las variables de entorno se están cargando correctamente
"""
import os
from dotenv import load_dotenv

# Cargar .env
load_dotenv()

print("🔍 Variables de entorno cargadas:")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY')[:20]}..." if os.getenv('SUPABASE_ANON_KEY') else "SUPABASE_ANON_KEY: None")
print(f"SUPABASE_BUCKET: {os.getenv('SUPABASE_BUCKET')}")
print(f"SUPABASE_BUCKET (con default): {os.getenv('SUPABASE_BUCKET', 'order-receipts')}")
