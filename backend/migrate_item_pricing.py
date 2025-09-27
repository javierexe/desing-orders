#!/usr/bin/env python3
"""
Migración para agregar campos de precio y abono a los items
"""

from sqlalchemy import text
from app.db import engine


def main():
    with engine.connect() as conn:
        # Agregar columnas de precio y abono a order_items
        try:
            print("Agregando columna 'price' a order_items...")
            conn.execute(text("""
                ALTER TABLE order_items 
                ADD COLUMN price NUMERIC(10,2) DEFAULT 0.00 NOT NULL
            """))
            
            print("Agregando columna 'paid_amount' a order_items...")
            conn.execute(text("""
                ALTER TABLE order_items 
                ADD COLUMN paid_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL
            """))
            
            conn.commit()
            print("✅ Migración completada exitosamente")
            
        except Exception as e:
            print(f"⚠️  Error durante la migración: {e}")
            # Si las columnas ya existen, no es un error fatal
            if "already exists" in str(e).lower():
                print("Las columnas ya existen, continuando...")
            else:
                raise


if __name__ == "__main__":
    main()