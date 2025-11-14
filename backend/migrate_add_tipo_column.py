"""
Migración: Agregar columna 'tipo' a tabla clientes
Reemplaza la columna 'giro' por 'tipo' con valores: 'particular' o 'empresa'
"""
from app.db import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # 1. Agregar columna 'tipo'
        print("1. Agregando columna 'tipo'...")
        db.execute(text("""
            ALTER TABLE clientes 
            ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'particular' NOT NULL
        """))
        db.commit()
        print("✓ Columna 'tipo' agregada")
        
        # 2. Migrar datos de 'giro' a 'tipo' si existe la columna giro
        print("2. Migrando datos de 'giro' a 'tipo'...")
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clientes' AND column_name = 'giro'
        """))
        if result.fetchone():
            # Si giro existe, copiar valores que sean 'empresa', el resto será 'particular'
            db.execute(text("""
                UPDATE clientes 
                SET tipo = CASE 
                    WHEN LOWER(giro) LIKE '%empresa%' OR LOWER(giro) LIKE '%soc%' THEN 'empresa'
                    ELSE 'particular'
                END
            """))
            db.commit()
            print("✓ Datos migrados de 'giro' a 'tipo'")
            
            # 3. Opcional: Eliminar columna 'giro'
            print("3. Eliminando columna 'giro'...")
            db.execute(text("ALTER TABLE clientes DROP COLUMN IF EXISTS giro"))
            db.commit()
            print("✓ Columna 'giro' eliminada")
        else:
            print("✓ Columna 'giro' no existe, nada que migrar")
        
        print("\n✅ Migración completada exitosamente!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error en migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
