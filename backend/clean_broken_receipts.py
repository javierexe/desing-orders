#!/usr/bin/env python3
"""
Script para limpiar receipts rotos (URLs locales sin archivos físicos)
"""
import sys
sys.path.append('/Users/javier/repos/desing-orders/backend')

from app.db import SessionLocal
from app.models import OrderReceipt

def clean_broken_receipts():
    print("\n" + "="*80)
    print("🧹 LIMPIEZA DE COMPROBANTES ROTOS")
    print("="*80 + "\n")
    
    db = SessionLocal()
    
    try:
        # Buscar todos los receipts con URLs locales
        receipts = db.query(OrderReceipt).filter(
            OrderReceipt.url.like('%/api/uploads/comprobantes/%')
        ).all()
        
        print(f"📋 Encontrados {len(receipts)} comprobantes con URLs locales (rotas)")
        
        if len(receipts) == 0:
            print("✅ No hay comprobantes rotos para limpiar")
            return
        
        # Mostrar detalles de los receipts a eliminar
        print("\n📄 Comprobantes que se eliminarán:")
        for receipt in receipts:
            order = db.query(Order).filter(Order.id == receipt.order_id).first()
            print(f"   - {order.code if order else 'N/A'}: {receipt.filename or receipt.url.split('/')[-1]}")
        
        print(f"\n⚠️  ¿Deseas ELIMINAR estos {len(receipts)} comprobantes de la BD? (s/n)")
        print("    (Los usuarios podrán volver a subirlos desde la app)")
        
        # Eliminar los receipts
        for receipt in receipts:
            print(f"   🗑️  Eliminando receipt ID {receipt.id} (orden ID: {receipt.order_id})")
            db.delete(receipt)
        
        db.commit()
        
        print("\n" + "="*80)
        print(f"✅ Limpieza completada!")
        print(f"   🗑️  Eliminados: {len(receipts)} registros")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_broken_receipts()
