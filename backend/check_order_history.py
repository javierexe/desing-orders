"""
Script para verificar el historial de cambios en pedidos específicos
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import engine
from sqlalchemy import text

def check_specific_orders():
    print("🔍 Verificando detalles de pedidos en 'listo'...\n")
    
    with engine.connect() as conn:
        # Obtener todos los campos de los pedidos en listo
        result = conn.execute(text("""
            SELECT 
                id,
                code, 
                client_name, 
                title,
                status,
                due_date,
                ready_date,
                delivered_date,
                description
            FROM orders 
            WHERE status = 'listo'
            ORDER BY code
        """))
        
        rows = result.fetchall()
        
        for row in rows:
            order_id, code, client, title, status, due_date, ready_date, delivered, desc = row
            print(f"📦 {code} - {client}")
            print(f"   Título: {title}")
            print(f"   Status: {status}")
            print(f"   Due Date: {due_date}")
            print(f"   Ready Date: {ready_date}")
            print(f"   Delivered Date: {delivered}")
            print()

if __name__ == "__main__":
    try:
        check_specific_orders()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
