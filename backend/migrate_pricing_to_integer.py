#!/usr/bin/env python3
"""
Migración para cambiar tipos de datos de precio y abono de NUMERIC a INTEGER
"""

from sqlalchemy import text
from app.db import engine


def main():
    with engine.connect() as conn:
        try:
            print("Cambiando tipo de columna 'price' de NUMERIC a INTEGER...")
            conn.execute(text("""
                ALTER TABLE order_items 
                DROP COLUMN IF EXISTS price
            """))
            
            conn.execute(text("""
                ALTER TABLE order_items 
                ADD COLUMN price INTEGER DEFAULT 0 NOT NULL
            """))
            
            print("Cambiando tipo de columna 'paid_amount' de NUMERIC a INTEGER...")
            conn.execute(text("""
                ALTER TABLE order_items 
                DROP COLUMN IF EXISTS paid_amount
            """))
            
            conn.execute(text("""
                ALTER TABLE order_items 
                ADD COLUMN paid_amount INTEGER DEFAULT 0 NOT NULL
            """))
            
            conn.commit()
            print("✅ Migración completada exitosamente")
            
        except Exception as e:
            print(f"⚠️  Error durante la migración: {e}")
            raise


if __name__ == "__main__":
    main()