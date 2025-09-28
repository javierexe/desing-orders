#!/usr/bin/env python3
"""
Migración: Agregar campo delivered_date a la tabla orders
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import SessionLocal

def migrate_add_delivered_date():
    """Agrega la columna delivered_date a la tabla orders"""
    
    print("🔄 Iniciando migración: agregar delivered_date...")
    
    db = SessionLocal()
    
    try:
        # Verificar si la columna ya existe
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'delivered_date'
        """))
        
        if result.fetchone():
            print("⚠️  La columna 'delivered_date' ya existe. Saltando migración.")
            return
        
        # Agregar la columna delivered_date
        print("➕ Agregando columna delivered_date...")
        db.execute(text("""
            ALTER TABLE orders 
            ADD COLUMN delivered_date DATE NULL
        """))
        
        db.commit()
        print("✅ Migración completada exitosamente!")
        print("📝 Se agregó la columna 'delivered_date' (DATE, nullable) a la tabla 'orders'")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_add_delivered_date()