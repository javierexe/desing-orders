#!/usr/bin/env python3
"""
Script para limpiar productos duplicados en la base de datos.
Mantiene el producto más antiguo (menor ID) y elimina los duplicados.
"""

import sys
import os

# Agregar el path del backend para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models import Producto
from app.db import get_db_url

def clean_duplicates():
    """Elimina productos duplicados basándose en el nombre."""
    
    # Crear conexión a la BD
    DATABASE_URL = get_db_url()
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Encontrar productos con el mismo nombre
        duplicates_query = db.query(
            Producto.nombre,
            func.count(Producto.id).label('count')
        ).group_by(Producto.nombre).having(func.count(Producto.id) > 1)
        
        duplicates = duplicates_query.all()
        
        if not duplicates:
            print("✅ No se encontraron productos duplicados")
            return
        
        print(f"🔍 Encontrados {len(duplicates)} productos con duplicados:")
        
        total_deleted = 0
        
        for nombre, count in duplicates:
            print(f"\n📦 '{nombre}' ({count} copias)")
            
            # Obtener todas las copias ordenadas por ID
            productos = db.query(Producto).filter(
                Producto.nombre == nombre
            ).order_by(Producto.id).all()
            
            # Mantener el primero (más antiguo), eliminar el resto
            keeper = productos[0]
            to_delete = productos[1:]
            
            print(f"   ✓ Manteniendo: ID={keeper.id}, codigo={keeper.codigo}")
            
            for prod in to_delete:
                print(f"   ✗ Eliminando: ID={prod.id}, codigo={prod.codigo}")
                db.delete(prod)
                total_deleted += 1
        
        # Confirmar cambios
        print(f"\n💾 Guardando cambios...")
        db.commit()
        
        print(f"\n✅ Limpieza completada:")
        print(f"   - {len(duplicates)} productos tenían duplicados")
        print(f"   - {total_deleted} registros duplicados eliminados")
        print(f"   - {len(duplicates)} productos únicos conservados")
        
    except Exception as e:
        print(f"\n❌ Error durante la limpieza: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Iniciando limpieza de productos duplicados...\n")
    clean_duplicates()
