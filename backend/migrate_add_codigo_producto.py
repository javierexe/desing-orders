#!/usr/bin/env python3
"""
Migración: Agregar campo 'codigo' a productos
Genera códigos automáticamente para productos existentes basados en categoría
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def generar_codigo(categoria_nombre, numero):
    """Genera código tipo PAP-001 a partir del nombre de categoría"""
    if not categoria_nombre:
        return f"GEN-{str(numero).zfill(3)}"
    
    # Tomar primeros 3 caracteres en mayúscula
    prefijo = categoria_nombre[:3].upper().replace(" ", "")
    return f"{prefijo}-{str(numero).zfill(3)}"

def migrate():
    db = SessionLocal()
    try:
        # 1. Agregar columna codigo (nullable por ahora)
        print("📝 Agregando columna 'codigo' a productos...")
        db.execute(text("""
            ALTER TABLE productos 
            ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);
        """))
        db.commit()
        print("✅ Columna 'codigo' agregada")
        
        # 2. Generar códigos para productos existentes
        print("\n🔢 Generando códigos para productos existentes...")
        
        # Obtener productos sin código, agrupados por categoría
        result = db.execute(text("""
            SELECT p.id, p.nombre, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.codigo IS NULL
            ORDER BY c.nombre NULLS LAST, p.id
        """))
        
        productos = result.fetchall()
        
        # Contar por categoría para numeración incremental
        categoria_contadores = {}
        
        for prod in productos:
            cat_nombre = prod.categoria_nombre or "GENERAL"
            
            # Incrementar contador de categoría
            if cat_nombre not in categoria_contadores:
                categoria_contadores[cat_nombre] = 1
            else:
                categoria_contadores[cat_nombre] += 1
            
            codigo = generar_codigo(cat_nombre, categoria_contadores[cat_nombre])
            
            # Verificar que no exista (por si acaso)
            exists = db.execute(text("SELECT id FROM productos WHERE codigo = :codigo"), {"codigo": codigo}).fetchone()
            if exists:
                # Si existe, usar timestamp para unicidad
                import time
                codigo = f"{codigo}-{int(time.time() % 10000)}"
            
            db.execute(text("""
                UPDATE productos 
                SET codigo = :codigo 
                WHERE id = :id
            """), {"codigo": codigo, "id": prod.id})
            
            print(f"  ✓ {prod.nombre[:40]:40} → {codigo}")
        
        db.commit()
        print(f"\n✅ {len(productos)} códigos generados")
        
        # 3. Agregar constraint unique
        print("\n🔒 Agregando constraint UNIQUE a 'codigo'...")
        db.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo 
            ON productos(codigo);
        """))
        db.commit()
        print("✅ Constraint UNIQUE agregado")
        
        print("\n🎉 Migración completada exitosamente")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error en migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
