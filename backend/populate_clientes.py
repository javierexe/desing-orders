"""
Script para poblar la tabla de clientes con los nombres únicos de pedidos existentes
"""
from app.db import SessionLocal
from app.models import Order, Cliente
from sqlalchemy import text

def populate_clientes_from_orders():
    db = SessionLocal()
    try:
        # 1. Obtener todos los nombres de clientes únicos de los pedidos
        print("1. Obteniendo nombres de clientes de pedidos...")
        result = db.execute(text("""
            SELECT DISTINCT TRIM(client_name) as nombre
            FROM orders
            WHERE client_name IS NOT NULL 
            AND TRIM(client_name) != ''
            ORDER BY TRIM(client_name)
        """))
        
        nombres_unicos = [row[0] for row in result]
        print(f"✓ Encontrados {len(nombres_unicos)} nombres únicos de clientes")
        
        # 2. Verificar cuáles ya existen en la tabla clientes
        print("\n2. Verificando clientes existentes...")
        clientes_existentes = db.query(Cliente.nombre).all()
        nombres_existentes = {c[0].strip().lower() for c in clientes_existentes}
        print(f"✓ {len(nombres_existentes)} clientes ya existen en la BD")
        
        # 3. Crear registros para los que no existen
        print("\n3. Creando nuevos registros de clientes...")
        nuevos_clientes = []
        for nombre in nombres_unicos:
            if nombre.strip().lower() not in nombres_existentes:
                # Intentar determinar si es empresa o particular por el nombre
                tipo = 'empresa' if any(word in nombre.lower() for word in [
                    'ltda', 'spa', 'sa', 'limitada', 'sociedad', 'empresa', 
                    'comercial', 'industrial', 'servicios', 'group', 'corp'
                ]) else 'particular'
                
                nuevo_cliente = Cliente(
                    nombre=nombre.strip(),
                    tipo=tipo,
                    activo=True
                )
                nuevos_clientes.append(nuevo_cliente)
                db.add(nuevo_cliente)
        
        if nuevos_clientes:
            db.commit()
            print(f"✅ {len(nuevos_clientes)} nuevos clientes creados:")
            for c in nuevos_clientes[:10]:  # Mostrar los primeros 10
                print(f"   - {c.nombre} ({c.tipo})")
            if len(nuevos_clientes) > 10:
                print(f"   ... y {len(nuevos_clientes) - 10} más")
        else:
            print("✓ No hay nuevos clientes para crear")
        
        # 4. Resumen final
        print("\n" + "="*60)
        print("RESUMEN:")
        print(f"  Total nombres únicos en pedidos: {len(nombres_unicos)}")
        print(f"  Clientes ya existentes: {len(nombres_existentes)}")
        print(f"  Nuevos clientes creados: {len(nuevos_clientes)}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_clientes_from_orders()
