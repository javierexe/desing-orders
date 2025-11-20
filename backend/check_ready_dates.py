"""
Script para verificar las fechas de pedidos en estado 'listo'
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import engine
from sqlalchemy import text

def check_ready_dates():
    print("🔍 Consultando pedidos en estado 'listo'...\n")
    
    with engine.connect() as conn:
        # Consultar pedidos en estado listo
        result = conn.execute(text("""
            SELECT 
                code, 
                client_name, 
                title,
                status,
                due_date,
                ready_date,
                delivered_date
            FROM orders 
            WHERE status = 'listo'
            ORDER BY code
        """))
        
        rows = result.fetchall()
        
        if not rows:
            print("❌ No hay pedidos en estado 'listo'")
            return
        
        print(f"📦 Encontrados {len(rows)} pedidos en estado 'listo':\n")
        print(f"{'Código':<10} {'Cliente':<25} {'Due Date':<12} {'Ready Date':<12} {'Título'}")
        print("-" * 100)
        
        today = "2025-11-20"
        ready_today_count = 0
        
        for row in rows:
            code, client, title, status, due_date, ready_date, delivered = row
            
            # Marcar si ready_date es hoy
            ready_marker = " ⚠️ HOY" if str(ready_date) == today else ""
            if str(ready_date) == today:
                ready_today_count += 1
            
            print(f"{code:<10} {client[:24]:<25} {str(due_date or 'N/A'):<12} {str(ready_date or 'NULL'):<12}{ready_marker} {title[:40]}")
        
        print("\n" + "=" * 100)
        print(f"⚠️  Pedidos con ready_date = HOY (2025-11-20): {ready_today_count} de {len(rows)}")
        
        # Verificar si había pedidos sin ready_date
        result2 = conn.execute(text("""
            SELECT COUNT(*) 
            FROM orders 
            WHERE status = 'listo' AND ready_date IS NULL
        """))
        null_count = result2.fetchone()[0]
        print(f"📋 Pedidos en 'listo' SIN ready_date (NULL): {null_count}")

if __name__ == "__main__":
    try:
        check_ready_dates()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
