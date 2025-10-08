#!/usr/bin/env python3
"""
Script para migrar comprobantes antiguos de almacenamiento local a Supabase Storage

Este script:
1. Busca todos los receipts con URLs locales (/api/uploads/comprobantes/)
2. Lee el archivo local si existe
3. Lo sube a Supabase con nombre descriptivo (orden_monto_timestamp)
4. Actualiza la BD con la nueva URL de Supabase
"""
import os
import sys
sys.path.append('/Users/javier/repos/desing-orders/backend')

from app.db import SessionLocal
from app.models import OrderReceipt, Order
from app.supabase_storage import get_supabase_storage
from dotenv import load_dotenv
from datetime import datetime

load_dotenv('/Users/javier/repos/desing-orders/backend/.env')

# Directorio donde están los archivos antiguos
UPLOADS_DIR = '/Users/javier/repos/desing-orders/backend/uploads/comprobantes'

def migrate_receipts():
    print("\n" + "="*80)
    print("🔄 MIGRACIÓN DE COMPROBANTES A SUPABASE STORAGE")
    print("="*80 + "\n")
    
    db = SessionLocal()
    storage = get_supabase_storage()
    
    try:
        # Buscar todos los receipts con URLs locales
        receipts = db.query(OrderReceipt).filter(
            OrderReceipt.url.like('%/api/uploads/comprobantes/%')
        ).all()
        
        print(f"📋 Encontrados {len(receipts)} comprobantes con URLs locales")
        
        if len(receipts) == 0:
            print("✅ No hay comprobantes para migrar")
            return
        
        print(f"\n¿Deseas migrar estos {len(receipts)} comprobantes a Supabase? (s/n)")
        response = input().strip().lower()
        
        if response != 's':
            print("❌ Migración cancelada")
            return
        
        migrated = 0
        skipped = 0
        errors = 0
        
        for receipt in receipts:
            try:
                # Obtener el pedido asociado para metadata
                order = db.query(Order).filter(Order.id == receipt.order_id).first()
                order_code = order.code if order else None
                
                # Extraer el nombre del archivo de la URL
                filename = receipt.url.split('/')[-1]
                filepath = os.path.join(UPLOADS_DIR, filename)
                
                print(f"\n📄 Procesando: {filename}")
                print(f"   📦 Orden: {order_code}")
                print(f"   📂 Path local: {filepath}")
                
                # Verificar si el archivo existe localmente
                if not os.path.exists(filepath):
                    print(f"   ⚠️  Archivo no encontrado localmente, omitiendo...")
                    skipped += 1
                    continue
                
                # Leer el archivo
                with open(filepath, 'rb') as f:
                    file_content = f.read()
                
                print(f"   📏 Tamaño: {len(file_content)} bytes")
                
                # Determinar content type basado en extensión
                ext = filename.split('.')[-1].lower()
                content_type_map = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp'
                }
                content_type = content_type_map.get(ext, 'image/jpeg')
                
                # Subir a Supabase con metadata
                print(f"   ☁️  Subiendo a Supabase...")
                public_url, storage_key = storage.upload_file(
                    file_content=file_content,
                    filename=filename,
                    content_type=content_type,
                    order_code=order_code,
                    amount=None  # No tenemos el monto en receipts antiguos
                )
                
                # Actualizar la BD
                receipt.url = public_url
                receipt.storage_key = storage_key
                db.commit()
                
                print(f"   ✅ Migrado exitosamente!")
                print(f"   📍 Nueva URL: {public_url}")
                print(f"   🔑 Storage key: {storage_key}")
                
                migrated += 1
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                import traceback
                traceback.print_exc()
                errors += 1
                db.rollback()
        
        print("\n" + "="*80)
        print(f"✅ Migración completada!")
        print(f"   📊 Total: {len(receipts)}")
        print(f"   ✅ Migrados: {migrated}")
        print(f"   ⚠️  Omitidos: {skipped}")
        print(f"   ❌ Errores: {errors}")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"❌ Error fatal: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_receipts()
