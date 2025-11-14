#!/usr/bin/env python3
"""
Migración: Agregar campo 'contacto' a la tabla clientes
- Para empresas, almacena el nombre del contacto principal
"""

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL no encontrada en .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def migrate():
    print("🔄 Iniciando migración: Agregar campo 'contacto'...")
    
    with engine.begin() as conn:
        # 1. Agregar columna contacto
        print("  1️⃣ Agregando columna 'contacto'...")
        conn.execute(text("""
            ALTER TABLE clientes 
            ADD COLUMN IF NOT EXISTS contacto VARCHAR(255);
        """))
        print("     ✅ Columna 'contacto' agregada")
    
    print("\n✅ Migración completada exitosamente!")
    print("📋 Campo agregado:")
    print("   - contacto (VARCHAR): Nombre del contacto para empresas")

if __name__ == "__main__":
    migrate()
