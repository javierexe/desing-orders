#!/usr/bin/env python3
"""
Script para generar códigos de producto para aquellos que no los tienen.
Usar código especial 'GRF' para 'Gran Formato' (GRA ya está ocupado por Grabados).
"""

from app.db import SessionLocal
from app.models import Producto, Categoria
from sqlalchemy import func

# Mapeo especial para categorías con nombres largos
CATEGORY_CODE_MAP = {
    'Gran Formato': 'GRF',  # GRA está ocupado por Grabados
    'Grabados': 'GRA',      # Ya existe, mantener
}

def obtener_prefijo(categoria_nombre):
    """Obtiene el prefijo de 3 letras para una categoría"""
    if categoria_nombre in CATEGORY_CODE_MAP:
        return CATEGORY_CODE_MAP[categoria_nombre]
    else:
        return categoria_nombre[:3].upper().replace(" ", "")


def obtener_siguiente_codigo(db, prefijo):
    """
    Obtiene el siguiente número disponible para un prefijo.
    Considera códigos existentes en la base de datos.
    """
    # Buscar el último código con este prefijo
    ultimos_codigos = db.query(Producto.codigo).filter(
        Producto.codigo.like(f"{prefijo}-%")
    ).all()
    
    if not ultimos_codigos:
        return f"{prefijo}-001"
    
    # Extraer números de todos los códigos
    numeros = []
    for (codigo,) in ultimos_codigos:
        partes = codigo.split('-')
        if len(partes) == 2:
            try:
                numeros.append(int(partes[1]))
            except ValueError:
                continue
    
    # Obtener el siguiente número
    if numeros:
        siguiente = max(numeros) + 1
    else:
        siguiente = 1
    
    return f"{prefijo}-{str(siguiente).zfill(3)}"


def main():
    db = SessionLocal()
    
    try:
        # Obtener productos sin código
        productos_sin_codigo = db.query(Producto).filter(Producto.codigo == None).all()
        
        print(f"📦 Encontrados {len(productos_sin_codigo)} productos sin código\n")
        
        if len(productos_sin_codigo) == 0:
            print("✅ Todos los productos ya tienen código!")
            return
        
        # Agrupar productos por categoría para asignar códigos secuenciales
        productos_por_categoria = {}
        
        for producto in productos_sin_codigo:
            if producto.categoria_id:
                categoria = db.query(Categoria).filter(Categoria.id == producto.categoria_id).first()
                categoria_nombre = categoria.nombre if categoria else 'General'
            else:
                categoria_nombre = 'General'
            
            prefijo = obtener_prefijo(categoria_nombre)
            
            if prefijo not in productos_por_categoria:
                productos_por_categoria[prefijo] = {
                    'nombre': categoria_nombre,
                    'productos': []
                }
            
            productos_por_categoria[prefijo]['productos'].append(producto)
        
        # Asignar códigos por categoría
        actualizados = 0
        
        for prefijo, info in sorted(productos_por_categoria.items()):
            categoria_nombre = info['nombre']
            productos = info['productos']
            
            print(f"\n🏷️  {categoria_nombre} ({prefijo}):")
            
            # Obtener el siguiente código disponible para esta categoría
            siguiente_codigo = obtener_siguiente_codigo(db, prefijo)
            partes = siguiente_codigo.split('-')
            numero_actual = int(partes[1])
            
            for producto in productos:
                codigo = f"{prefijo}-{str(numero_actual).zfill(3)}"
                producto.codigo = codigo
                
                print(f"  ✓ {producto.nombre[:45]:45} → {codigo}")
                
                numero_actual += 1
                actualizados += 1
        
        # Guardar cambios
        db.commit()
        
        print(f"\n✅ {actualizados} productos actualizados con códigos")
        
        # Mostrar resumen por categoría
        print("\n📊 Resumen de códigos por categoría:")
        categorias = db.query(Categoria).all()
        for cat in categorias:
            prefijo = obtener_prefijo(cat.nombre)
            count = db.query(func.count(Producto.id)).filter(
                Producto.codigo.like(f"{prefijo}-%")
            ).scalar()
            print(f"  {prefijo}: {count} productos ({cat.nombre})")
        
        # Productos sin categoría
        gen_count = db.query(func.count(Producto.id)).filter(
            Producto.codigo.like('GEN-%')
        ).scalar()
        if gen_count > 0:
            print(f"  GEN: {gen_count} productos (Sin categoría)")
            
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()

from app.db import SessionLocal
from app.models import Producto, Categoria

# Mapeo especial para categorías con nombres largos
CATEGORY_CODE_MAP = {
    'Gran Formato': 'GRF',  # GRA está ocupado por Grabados
    'Grabados': 'GRA',      # Ya existe, mantener
}

def generar_codigo_especial(db, categoria_id, categoria_nombre):
    """
    Genera código con reglas especiales para ciertas categorías
    """
    # Usar mapeo personalizado si existe
    if categoria_nombre in CATEGORY_CODE_MAP:
        prefijo = CATEGORY_CODE_MAP[categoria_nombre]
    else:
        # Tomar primeras 3 letras del nombre
        prefijo = categoria_nombre[:3].upper().replace(" ", "")
    
    # Contar productos con ese prefijo
    from sqlalchemy import func
    count = db.query(func.count(Producto.id)).filter(
        Producto.codigo.like(f"{prefijo}-%")
    ).scalar() or 0
    
    # Generar código
    numero = count + 1
    codigo = f"{prefijo}-{str(numero).zfill(3)}"
    
    # Verificar unicidad
    max_intentos = 100
    for _ in range(max_intentos):
        existe = db.query(Producto).filter(Producto.codigo == codigo).first()
        if not existe:
            return codigo
        numero += 1
        codigo = f"{prefijo}-{str(numero).zfill(3)}"
    
    # Fallback
    import time
    return f"{prefijo}-{int(time.time() % 10000)}"


def main():
    db = SessionLocal()
    
    try:
        # Obtener productos sin código
        productos_sin_codigo = db.query(Producto).filter(Producto.codigo == None).all()
        
        print(f"📦 Encontrados {len(productos_sin_codigo)} productos sin código\n")
        
        if len(productos_sin_codigo) == 0:
            print("✅ Todos los productos ya tienen código!")
            return
        
        actualizados = 0
        
        # Cache para evitar recalcular contadores
        codigo_cache = {}
        
        for producto in productos_sin_codigo:
            if producto.categoria_id:
                categoria = db.query(Categoria).filter(Categoria.id == producto.categoria_id).first()
                categoria_nombre = categoria.nombre if categoria else 'General'
            else:
                categoria_nombre = 'General'
            
            # Generar código único usando cache
            codigo = generar_codigo_especial(db, producto.categoria_id, categoria_nombre)
            
            # Si el código ya fue usado en esta sesión, incrementar
            while codigo in codigo_cache:
                # Extraer prefijo y número
                partes = codigo.split('-')
                if len(partes) == 2:
                    prefijo = partes[0]
                    numero = int(partes[1]) + 1
                    codigo = f"{prefijo}-{str(numero).zfill(3)}"
            
            # Marcar como usado
            codigo_cache[codigo] = True
            producto.codigo = codigo
            
            print(f"  ✓ {producto.nombre[:40]:40} → {codigo} ({categoria_nombre})")
            actualizados += 1
            
            # Hacer flush periódico para evitar duplicados
            if actualizados % 10 == 0:
                db.flush()
        
        # Guardar cambios finales
        db.commit()
        
        print(f"\n✅ {actualizados} productos actualizados con códigos")
        
        # Mostrar productos de Gran Formato actualizados
        print("\n📋 Productos de Gran Formato:")
        gran_formato = db.query(Producto).filter(Producto.codigo.like('GRF-%')).all()
        for p in gran_formato:
            print(f"  {p.codigo}: {p.nombre}")
            
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
