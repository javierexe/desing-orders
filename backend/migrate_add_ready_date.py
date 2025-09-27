#!/usr/bin/env python3
"""
Migración: Agregar campo ready_date a la tabla orders
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import SessionLocal

def migrate_add_ready_date():
    print("🔄 Iniciando migración: agregar ready_date...")
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ready_date'
        """))
        if result.fetchone():
            print("⚠️  La columna 'ready_date' ya existe. Saltando migración.")
            return
        print("➕ Agregando columna ready_date...")
        db.execute(text("""
            ALTER TABLE orders ADD COLUMN ready_date DATE NULL
        """))
        db.commit()
        print("✅ Migración completada exitosamente!")
        print("📝 Se agregó la columna 'ready_date' (DATE, nullable) a la tabla 'orders'")
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_add_ready_date()
