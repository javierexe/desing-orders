#!/usr/bin/env python3
"""
Migración: Agregar campo abono_image_url a la tabla orders
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import SessionLocal


def migrate_add_abono_image():
    print("🔄 Iniciando migración: agregar abono_image_url...")
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'abono_image_url'
        """))
        if result.fetchone():
            print("⚠️  La columna 'abono_image_url' ya existe. Saltando migración.")
            return
        print("➕ Agregando columna abono_image_url...")
        db.execute(text("""
            ALTER TABLE orders ADD COLUMN abono_image_url VARCHAR(255) NULL
        """))
        db.commit()
        print("✅ Migración completada exitosamente!")
        print("📝 Se agregó la columna 'abono_image_url' (VARCHAR(255), nullable) a la tabla 'orders'")
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_add_abono_image()
