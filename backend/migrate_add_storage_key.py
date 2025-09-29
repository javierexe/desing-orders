#!/usr/bin/env python3
"""
Migración: Añadir columna storage_key a order_receipts usando backend/migrations/002_add_storage_key_to_order_receipts.sql
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db import SessionLocal

SQL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations", "002_add_storage_key_to_order_receipts.sql")


def migrate_add_storage_key():
    print("🔄 Iniciando migración: añadir columna storage_key a order_receipts...")
    db = SessionLocal()
    try:
        # Verificar si la columna ya existe
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='order_receipts' AND column_name='storage_key'
        """))
        exists = result.fetchone()
        if exists and exists[0]:
            print("⚠️  La columna 'storage_key' ya existe en 'order_receipts'. Saltando migración.")
            return

        if not os.path.exists(SQL_PATH):
            raise FileNotFoundError(f"No se encontró el archivo SQL de migración: {SQL_PATH}")

        with open(SQL_PATH, 'r', encoding='utf-8') as f:
            sql = f.read()

        print("➕ Ejecutando SQL de migración...")
        db.execute(text(sql))
        db.commit()
        print("✅ Migración completada exitosamente!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_add_storage_key()
