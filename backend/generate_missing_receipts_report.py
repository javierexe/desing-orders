#!/usr/bin/env python3
"""
Script para generar reporte de comprobantes perdidos.
Entrega información detallada al cliente sobre qué comprobantes debe re-subir.
"""

from sqlalchemy.orm import sessionmaker
from app.models import OrderReceipt, Order, OrderItem
from app.db import SessionLocal

def main():
    db = SessionLocal()

    # Buscar comprobantes con URLs locales
    broken_receipts = db.query(OrderReceipt).filter(
        OrderReceipt.url.like('%/api/uploads/comprobantes/%')
    ).all()

    print('=' * 80)
    print('📋 REPORTE DE COMPROBANTES PERDIDOS')
    print('=' * 80)
    print(f'\nTotal de comprobantes a re-subir: {len(broken_receipts)}\n')
    print('=' * 80)

    # Agrupar por orden
    orders_affected = {}
    for receipt in broken_receipts:
        order = db.query(Order).filter(Order.id == receipt.order_id).first()
        if order:
            if order.code not in orders_affected:
                orders_affected[order.code] = {
                    'client': order.client_name,
                    'status': order.status,
                    'receipts': [],
                    'items': []
                }
            orders_affected[order.code]['receipts'].append({
                'filename': receipt.filename,
                'uploaded_at': receipt.uploaded_at
            })

    # Obtener items de cada orden
    for code, data in orders_affected.items():
        order = db.query(Order).filter(Order.code == code).first()
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in items:
            data['items'].append({
                'description': item.description,
                'quantity': item.quantity,
                'price': item.price,
                'paid': item.paid_amount
            })

    # Imprimir reporte
    for code in sorted(orders_affected.keys()):
        data = orders_affected[code]
        print(f'\n🔖 PEDIDO: {code}')
        print(f'👤 Cliente: {data["client"]}')
        print(f'📊 Estado: {data["status"]}')
        print(f'\n   Items del pedido:')
        
        total_price = 0
        total_paid = 0
        for item in data['items']:
            total_price += item['price']
            total_paid += item['paid']
            print(f'   • {item["description"]}')
            print(f'     Cantidad: {item["quantity"]} | Precio: ${item["price"]:,} CLP | Abonado: ${item["paid"]:,} CLP')
        
        pending = total_price - total_paid
        print(f'\n   💰 Totales:')
        print(f'      Precio Total: ${total_price:,} CLP')
        print(f'      Total Abonado: ${total_paid:,} CLP')
        print(f'      Pendiente: ${pending:,} CLP')
        
        print(f'\n   📎 Comprobantes perdidos ({len(data["receipts"])}):')
        for r in data['receipts']:
            print(f'      • {r["filename"]} (subido el {r["uploaded_at"]})')
        
        print('\n' + '-' * 80)

    print('\n' + '=' * 80)
    print('📌 RESUMEN PARA EL CLIENTE')
    print('=' * 80)
    print(f'\nPedidos afectados: {len(orders_affected)}')
    print(f'Comprobantes a re-subir: {len(broken_receipts)}')
    print('\n⚠️  Acción requerida:')
    print('Por favor, vuelva a subir los comprobantes de pago para los pedidos listados arriba.')
    print('Los montos abonados están registrados correctamente en el sistema.')
    print('Solo necesitamos las imágenes/PDFs de los comprobantes para completar el registro.')
    print('=' * 80)

    db.close()

if __name__ == "__main__":
    main()
