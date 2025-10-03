"""
Migración: Agregar tablas de Productos, Categorías y Clientes
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL no está configurada en .env")

engine = create_engine(DATABASE_URL)

# Script SQL de migración
migration_sql = """
-- =====================================================
-- 1. TABLA CATEGORÍAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para categorías
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);

-- Datos iniciales de categorías
INSERT INTO categorias (nombre, icono, orden) VALUES
    ('Papelería', '📄', 1),
    ('Textil', '👕', 2),
    ('Merchandising', '🎁', 3),
    ('Diseño', '🎨', 4),
    ('Sublimación', '☕', 5),
    ('Cuadros', '🖼️', 6),
    ('Grabados', '⚡', 7),
    ('Etiquetas', '🏷️', 8),
    ('Gran Formato', '📏', 9),
    ('Impresión 3D', '🖨️', 10)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- 2. TABLA PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    
    -- Precios (en pesos chilenos)
    precio_base INTEGER,
    requiere_cotizacion BOOLEAN DEFAULT FALSE,
    
    -- Información del producto
    descripcion TEXT,
    especificaciones JSONB,
    
    -- Presentación y unidades
    presentacion VARCHAR(100),
    unidad_medida VARCHAR(50),
    
    -- Variantes (para productos con tamaños/colores)
    producto_padre_id INTEGER REFERENCES productos(id),
    
    -- Media
    imagen_url TEXT,
    
    -- Estado y búsqueda
    activo BOOLEAN DEFAULT TRUE,
    tags TEXT[],
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_tags ON productos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

-- =====================================================
-- 3. TABLA CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    telefono VARCHAR(50),
    direccion TEXT,
    comuna VARCHAR(100),
    region VARCHAR(100),
    
    -- Información de negocio
    rut VARCHAR(20),
    razon_social VARCHAR(200),
    giro VARCHAR(200),
    
    -- Notas y seguimiento
    notas TEXT,
    preferencias JSONB,
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- =====================================================
-- 4. MODIFICAR TABLAS EXISTENTES
-- =====================================================

-- Agregar columna cliente_id a orders (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'cliente_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);
        CREATE INDEX idx_orders_cliente ON orders(cliente_id);
    END IF;
END $$;

-- Agregar columna producto_id a order_items (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'producto_id'
    ) THEN
        ALTER TABLE order_items ADD COLUMN producto_id INTEGER REFERENCES productos(id);
        CREATE INDEX idx_order_items_producto ON order_items(producto_id);
    END IF;
END $$;

-- Hacer client_name nullable (ya que ahora tendremos cliente_id)
DO $$ 
BEGIN
    ALTER TABLE orders ALTER COLUMN client_name DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
"""

def run_migration():
    print("🚀 Iniciando migración: Productos, Categorías y Clientes...")
    
    try:
        with engine.connect() as conn:
            # Ejecutar migración en una transacción
            trans = conn.begin()
            try:
                conn.execute(text(migration_sql))
                trans.commit()
                print("✅ Migración completada exitosamente!")
                
                # Verificar tablas creadas
                result = conn.execute(text("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('categorias', 'productos', 'clientes')
                    ORDER BY table_name
                """))
                
                tables = [row[0] for row in result]
                print(f"\n📋 Tablas creadas/verificadas: {', '.join(tables)}")
                
                # Contar categorías
                result = conn.execute(text("SELECT COUNT(*) FROM categorias"))
                count = result.scalar()
                print(f"📂 Categorías insertadas: {count}")
                
            except Exception as e:
                trans.rollback()
                raise e
                
    except Exception as e:
        print(f"❌ Error en migración: {e}")
        raise

if __name__ == "__main__":
    run_migration()
