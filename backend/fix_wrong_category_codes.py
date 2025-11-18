#!/usr/bin/env python3
"""
Script para corregir códigos de productos que tienen el prefijo incorrecto según su categoría.
- Gran Formato debe usar GRF (no GRA)
- Grabados debe usar GRA (no NO u otros)
"""

from app.db import SessionLocal
from app.models import Producto, Categoria
from sqlalchemy import func

# Mapeo correcto de categorías
CATEGORY_CODE_MAP = {
    'Gran Formato': 'GRF',
    'Grabados': 'GRA',
}

def obtener_prefijo_correcto(categoria_nombre):
    """Obtiene el prefijo correcto de 3 letras para una categoría"""
    if categoria_nombre in CATEGORY_CODE_MAP:
        return CATEGORY_CODE_MAP[categoria_nombre]
    else:
        return categoria_nombre[:3].upper().replace(" ", "")


def obtener_siguiente_codigo(db, prefijo):
    """
    Obtiene el siguiente número disponible para un prefijo.
    """
    ultimos_codigos = db.query(Producto.codigo).filter(
        Producto.codigo.like(f"{prefijo}-%")
    ).all()
    
    if not ultimos_codigos:
        return f"{prefijo}-001"
    
    numeros = []
    for (codigo,) in ultimos_codigos:
        partes = codigo.split('-')
        if len(partes) == 2:
            try:
                numeros.append(int(partes[1]))
            except ValueError:
                continue
    
    if numeros:
        siguiente = max(numeros) + 1
    else:
        siguiente = 1
    
    return f"{prefijo}-{str(siguiente).zfill(3)}"


def main():
    db = SessionLocal()
    
    try:
        # 1. Corregir productos de Gran Formato con código GRA-
        print("🔧 Corrigiendo productos de Gran Formato con código incorrecto (GRA-)...\n")
        
        gran_formato = db.query(Categoria).filter(Categoria.nombre == 'Gran Formato').first()
        if gran_formato:
            productos_gf_incorrectos = db.query(Producto).filter(
                Producto.categoria_id == gran_formato.id,
                Producto.codigo.like('GRA-%')
            ).all()
            
            if productos_gf_incorrectos:
                print(f"Encontrados {len(productos_gf_incorrectos)} productos de Gran Formato con código GRA-:\n")
                
                # Generar todos los códigos secuencialmente
                prefijo = 'GRF'
                siguiente_num = 1
                
                # Obtener el número máximo existente
                ultimos_codigos = db.query(Producto.codigo).filter(
                    Producto.codigo.like(f"{prefijo}-%")
                ).all()
                
                if ultimos_codigos:
                    numeros = []
                    for (codigo,) in ultimos_codigos:
                        partes = codigo.split('-')
                        if len(partes) == 2:
                            try:
                                numeros.append(int(partes[1]))
                            except ValueError:
                                continue
                    if numeros:
                        siguiente_num = max(numeros) + 1
                
                # Asignar códigos secuenciales
                for prod in productos_gf_incorrectos:
                    nuevo_codigo = f"{prefijo}-{str(siguiente_num).zfill(3)}"
                    print(f"  {prod.codigo} → {nuevo_codigo} | {prod.nombre}")
                    prod.codigo = nuevo_codigo
                    siguiente_num += 1
                
                db.flush()
            else:
                print("  ✅ No hay productos de Gran Formato con código incorrecto")
        
        # 2. Corregir productos de Grabados con código NO- u otros incorrectos
        print("\n🔧 Corrigiendo productos de Grabados con código incorrecto (NO- u otros)...\n")
        
        grabados = db.query(Categoria).filter(Categoria.nombre == 'Grabados').first()
        if grabados:
            productos_grab_incorrectos = db.query(Producto).filter(
                Producto.categoria_id == grabados.id,
                ~Producto.codigo.like('GRA-%')  # Todos los que NO empiezan con GRA-
            ).all()
            
            if productos_grab_incorrectos:
                print(f"Encontrados {len(productos_grab_incorrectos)} productos de Grabados con código incorrecto:\n")
                
                # Generar todos los códigos secuencialmente
                prefijo = 'GRA'
                siguiente_num = 1
                
                # Obtener el número máximo existente
                ultimos_codigos = db.query(Producto.codigo).filter(
                    Producto.codigo.like(f"{prefijo}-%")
                ).all()
                
                if ultimos_codigos:
                    numeros = []
                    for (codigo,) in ultimos_codigos:
                        partes = codigo.split('-')
                        if len(partes) == 2:
                            try:
                                numeros.append(int(partes[1]))
                            except ValueError:
                                continue
                    if numeros:
                        siguiente_num = max(numeros) + 1
                
                # Asignar códigos secuenciales
                for prod in productos_grab_incorrectos:
                    codigo_anterior = prod.codigo
                    nuevo_codigo = f"{prefijo}-{str(siguiente_num).zfill(3)}"
                    print(f"  {codigo_anterior} → {nuevo_codigo} | {prod.nombre}")
                    prod.codigo = nuevo_codigo
                    siguiente_num += 1
                
                db.flush()
            else:
                print("  ✅ No hay productos de Grabados con código incorrecto")
        
        # Guardar todos los cambios
        db.commit()
        
        # Mostrar resumen final
        print("\n" + "="*70)
        print("📊 RESUMEN FINAL - Códigos por categoría:")
        print("="*70 + "\n")
        
        categorias = db.query(Categoria).all()
        for cat in categorias:
            prefijo = obtener_prefijo_correcto(cat.nombre)
            count = db.query(func.count(Producto.id)).filter(
                Producto.codigo.like(f"{prefijo}-%")
            ).scalar()
            
            if count > 0:
                print(f"  {prefijo}: {count:3d} productos | {cat.nombre}")
                
                # Mostrar algunos ejemplos
                ejemplos = db.query(Producto.codigo, Producto.nombre).filter(
                    Producto.categoria_id == cat.id,
                    Producto.codigo.like(f"{prefijo}-%")
                ).limit(3).all()
                
                for codigo, nombre in ejemplos:
                    print(f"       └─ {codigo}: {nombre[:50]}")
        
        print("\n✅ Corrección completada exitosamente!")
            
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
