#!/usr/bin/env python3
"""
Migración: Convertir datos de centavos a pesos chilenos
Convierte todos los price y paid_amount de centavos a pesos dividiendo por 100
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno
load_dotenv()

def migrate_centavos_to_pesos():
    """Convierte datos de centavos a pesos"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL no encontrada en .env")
        return False
    
    print("🔄 Iniciando migración de centavos a pesos...")
    
    try:
        # Crear conexión
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # 1. Verificar datos antes de la migración
        print("\n📊 Verificando datos antes de la migración...")
        
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN price > 0 THEN 1 ELSE 0 END) as items_with_price,
                SUM(CASE WHEN paid_amount > 0 THEN 1 ELSE 0 END) as items_with_paid_amount,
                MAX(price) as max_price,
                MAX(paid_amount) as max_paid_amount
            FROM order_items
        """))
        
        stats = result.fetchone()
        print(f"📈 Total items: {stats[0]}")
        print(f"📈 Items con precio > 0: {stats[1]}")
        print(f"📈 Items con abono > 0: {stats[2]}")
        print(f"📈 Precio máximo: ${stats[3]:,} (centavos)")
        print(f"📈 Abono máximo: ${stats[4]:,} (centavos)")
        
        # 2. Mostrar algunos ejemplos antes
        print("\n🔍 Ejemplos de datos actuales (en centavos):")
        examples = db.execute(text("""
            SELECT id, description, price, paid_amount 
            FROM order_items 
            WHERE price > 0 OR paid_amount > 0 
            LIMIT 5
        """))
        
        for row in examples:
            print(f"   ID {row[0]}: '{row[1]}' - Precio: ${row[2]:,}, Abono: ${row[3]:,}")
        
        # 3. Confirmar migración
        print(f"\n⚠️  ATENCIÓN: Esta migración convertirá todos los montos dividiéndolos por 100")
        print(f"   Ejemplo: $66,000 centavos → $660 pesos")
        
        confirm = input("\n¿Proceder con la migración? (sí/no): ").lower().strip()
        if confirm not in ['si', 'sí', 'yes', 'y']:
            print("❌ Migración cancelada")
            return False
        
        # 4. Ejecutar migración
        print("\n🔄 Ejecutando migración...")
        
        # Convertir price y paid_amount dividiendo por 100
        result = db.execute(text("""
            UPDATE order_items 
            SET 
                price = price / 100,
                paid_amount = paid_amount / 100
            WHERE price > 0 OR paid_amount > 0
        """))
        
        rows_affected = result.rowcount
        db.commit()
        
        print(f"✅ Migración completada: {rows_affected} items actualizados")
        
        # 5. Verificar resultados
        print("\n📊 Verificando datos después de la migración...")
        
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN price > 0 THEN 1 ELSE 0 END) as items_with_price,
                SUM(CASE WHEN paid_amount > 0 THEN 1 ELSE 0 END) as items_with_paid_amount,
                MAX(price) as max_price,
                MAX(paid_amount) as max_paid_amount
            FROM order_items
        """))
        
        stats = result.fetchone()
        print(f"📈 Total items: {stats[0]}")
        print(f"📈 Items con precio > 0: {stats[1]}")
        print(f"📈 Items con abono > 0: {stats[2]}")
        print(f"📈 Precio máximo: ${stats[3]:,} (pesos)")
        print(f"📈 Abono máximo: ${stats[4]:,} (pesos)")
        
        # 6. Mostrar ejemplos después
        print("\n🔍 Ejemplos de datos después (en pesos):")
        examples = db.execute(text("""
            SELECT id, description, price, paid_amount 
            FROM order_items 
            WHERE price > 0 OR paid_amount > 0 
            LIMIT 5
        """))
        
        for row in examples:
            print(f"   ID {row[0]}: '{row[1]}' - Precio: ${row[2]:,}, Abono: ${row[3]:,}")
        
        db.close()
        
        print("\n🎉 ¡Migración completada exitosamente!")
        print("💡 El sistema ahora trabaja directamente en pesos chilenos")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

if __name__ == "__main__":
    if migrate_centavos_to_pesos():
        print("\n✅ Todo listo - el sistema ahora usa pesos chilenos directamente")
        sys.exit(0)
    else:
        print("\n❌ Migración fallida")
        sys.exit(1)