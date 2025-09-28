#!/usr/bin/env python3
"""
Migración: Crear tabla order_receipts usando el SQL existente en backend/migrations/001_add_order_receipts.sql
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db import SessionLocal

SQL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations", "001_add_order_receipts.sql")


def migrate_add_order_receipts():
    print("🔄 Iniciando migración: crear tabla order_receipts...")
    db = SessionLocal()
    try:
        # Verificar si la tabla ya existe
        result = db.execute(text("""
            SELECT to_regclass('public.order_receipts') IS NOT NULL AS exists
        """))
        exists = result.fetchone()
        if exists and exists[0]:
            print("⚠️  La tabla 'order_receipts' ya existe. Saltando migración.")
            return

        # Leer SQL desde archivo
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
    migrate_add_order_receipts()
