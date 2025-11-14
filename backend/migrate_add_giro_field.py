#!/usr/bin/env python3
"""
Migración: Agregar campo 'giro' a la tabla 'clientes'
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Cargar variables de entorno desde .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en .env")

engine = create_engine(DATABASE_URL)

def migrate():
    """Agrega la columna 'giro' a la tabla clientes si no existe"""
    with engine.connect() as conn:
        # Verificar si la columna ya existe
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clientes' AND column_name='giro'
        """))
        
        if result.fetchone():
            print("✓ La columna 'giro' ya existe en la tabla 'clientes'")
            return
        
        # Agregar la columna
        conn.execute(text("""
            ALTER TABLE clientes 
            ADD COLUMN giro VARCHAR(255)
        """))
        conn.commit()
        print("✓ Columna 'giro' agregada exitosamente a la tabla 'clientes'")

if __name__ == "__main__":
    print("Iniciando migración: agregar campo 'giro' a tabla 'clientes'...")
    migrate()
    print("Migración completada.")
