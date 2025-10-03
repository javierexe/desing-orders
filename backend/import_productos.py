"""
Script para importar productos desde CSV a la base de datos
"""
import os
import csv
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL no está configurada en .env")

engine = create_engine(DATABASE_URL)

# Mapeo de categorías del CSV a IDs de la base de datos
CATEGORIA_MAP = {
    'Papelería': 1,
    'Textil': 2,
    'Merchandising': 3,
    'Diseño': 4,
    'Sublimación': 5,
    'Cuadros': 6,
    'Grabados': 7,
    'Etiquetas': 8,
    'Gran Formato': 9,
    'Impresión 3D': 10
}

def import_productos_from_csv(csv_path):
    print(f"📄 Leyendo productos desde: {csv_path}")
    
    productos_insertados = 0
    productos_error = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            with engine.connect() as conn:
                for row in csv_reader:
                    try:
                        # Extraer datos del CSV
                        producto_id = int(row['id'])
                        nombre = row['nombre'].strip()
                        categoria_nombre = row['categoria'].strip()
                        categoria_id = CATEGORIA_MAP.get(categoria_nombre)
                        
                        # Manejar precio_base (puede ser vacío o "False")
                        precio_str = row['precio_base'].strip()
                        precio_base = None
                        if precio_str and precio_str not in ('', 'False', 'None'):
                            try:
                                precio_base = int(float(precio_str))
                            except:
                                precio_base = None
                        
                        # Requiere cotización
                        requiere_cot_str = row['requiere_cotizacion'].strip()
                        requiere_cotizacion = requiere_cot_str.lower() in ('true', '1', 'yes')
                        
                        # Descripción
                        descripcion = row.get('descripcion', '').strip() or None
                        presentacion = row.get('presentacion', '').strip() or None
                        unidad_medida = row.get('unidad_medida', '').strip() or None
                        
                        # Insertar producto
                        insert_query = text("""
                            INSERT INTO productos (
                                id, nombre, categoria_id, precio_base, 
                                requiere_cotizacion, descripcion, presentacion, 
                                unidad_medida, activo
                            ) VALUES (
                                :id, :nombre, :categoria_id, :precio_base,
                                :requiere_cotizacion, :descripcion, :presentacion,
                                :unidad_medida, TRUE
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                nombre = EXCLUDED.nombre,
                                categoria_id = EXCLUDED.categoria_id,
                                precio_base = EXCLUDED.precio_base,
                                requiere_cotizacion = EXCLUDED.requiere_cotizacion,
                                descripcion = EXCLUDED.descripcion,
                                presentacion = EXCLUDED.presentacion,
                                unidad_medida = EXCLUDED.unidad_medida,
                                updated_at = NOW()
                        """)
                        
                        conn.execute(insert_query, {
                            'id': producto_id,
                            'nombre': nombre,
                            'categoria_id': categoria_id,
                            'precio_base': precio_base,
                            'requiere_cotizacion': requiere_cotizacion,
                            'descripcion': descripcion,
                            'presentacion': presentacion,
                            'unidad_medida': unidad_medida
                        })
                        
                        conn.commit()
                        productos_insertados += 1
                        print(f"✅ [{productos_insertados}] {nombre} - ${precio_base or 'Cotización'}")
                        
                    except Exception as e:
                        print(f"❌ Error procesando producto {row.get('nombre', 'desconocido')}: {e}")
                        productos_error.append(row.get('nombre', 'desconocido'))
                        continue
        
        print(f"\n🎉 Importación completada!")
        print(f"✅ Productos insertados: {productos_insertados}")
        if productos_error:
            print(f"❌ Productos con error: {len(productos_error)}")
            for p in productos_error:
                print(f"   - {p}")
        
        # Actualizar secuencia de IDs
        with engine.connect() as conn:
            conn.execute(text("SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos))"))
            conn.commit()
            print(f"\n🔧 Secuencia de IDs actualizada")
            
    except Exception as e:
        print(f"❌ Error fatal: {e}")
        raise

if __name__ == "__main__":
    # Buscar el CSV en Downloads
    csv_path = "/Users/javier/Downloads/productos_completos.csv"
    
    if not os.path.exists(csv_path):
        print(f"❌ No se encontró el archivo: {csv_path}")
        print("💡 Por favor, verifica la ruta del archivo CSV")
    else:
        import_productos_from_csv(csv_path)
