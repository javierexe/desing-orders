from fastapi import FastAPI, Depends, HTTPException, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .db import SessionLocal
from . import models, schemas
from .abono_image import router as abono_image_router
from .abono_receipts import router as abono_receipts_router
import logging


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.include_router(abono_image_router)
app.include_router(abono_receipts_router)

# CORS: ajusta dominios según tu front (localhost:5173, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.98:5173",
        "https://desing-orders3d-world.vercel.app",  # tu dominio de prod
    ],
    allow_origin_regex=r"https://.*\.vercel\.app$",  # habilita todos los previews de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_order_totals(order: models.Order):
    """Calcula los totales de precio, abonos y pendiente para una orden"""
    if not order.items:
        return {
            "total_price": 0,
            "total_paid": 0, 
            "pending_amount": 0
        }
    
    total_price = sum(item.price or 0 for item in order.items)
    total_paid = sum(item.paid_amount or 0 for item in order.items)
    pending_amount = total_price - total_paid
    
    return {
        "total_price": total_price,
        "total_paid": total_paid,
        "pending_amount": pending_amount
    }

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    orders = db.query(models.Order).options(joinedload(models.Order.items)).order_by(models.Order.id.desc()).all()
    
    # Agregar totales calculados a cada orden
    result = []
    for order in orders:
        totals = calculate_order_totals(order)
        # Map receipts if exist
        receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
        result.append(schemas.OrderOut(
            id=order.id,
            code=order.code,
            client_name=order.client_name,
            title=order.title,
            description=order.description,
            status=order.status,
            delivery_method=order.delivery_method,
            due_date=order.due_date,
            delivered_date=order.delivered_date,
            abono_image_url=order.abono_image_url,
            items=[schemas.OrderItemOut(
                id=item.id,
                description=item.description,
                quantity=item.quantity,
                due_date=item.due_date,
                price=item.price,
                paid_amount=item.paid_amount
            ) for item in order.items],
            receipts=receipts,
            **totals
        ))
    
    return result

@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # ⚠️ Ya no revisamos code, la BD lo maneja.
    # Creamos el objeto sin 'code'
    items_data = payload.items if hasattr(payload, "items") else []
    # Ajustar due_date a la fecha menor de los ítems si existe
    min_due = None
    if items_data:
        fechas = [item.due_date for item in items_data if item.due_date]
        if fechas:
            min_due = min(fechas)
    order_kwargs = payload.model_dump(exclude={"code", "items"})
    # Normalizar abono_image_url: guardar NULL en DB si viene vacío
    if "abono_image_url" in order_kwargs and not order_kwargs.get("abono_image_url"):
        order_kwargs["abono_image_url"] = None
    if min_due:
        order_kwargs["due_date"] = min_due
    order = models.Order(**order_kwargs)
    db.add(order)
    db.commit()
    db.refresh(order)

    # Crear los ítems asociados
    for item in items_data:
        order_item = models.OrderItem(
            order_id=order.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        )
        db.add(order_item)
    db.commit()
    
    # Recargar la orden completa con sus items
    from sqlalchemy.orm import joinedload
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == order.id).first()
    
    # Calcular totales
    totals = calculate_order_totals(order)
    
    # Map receipts
    receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
    # Construir response manualmente
    return schemas.OrderOut(
        id=order.id,
        code=order.code,
        client_name=order.client_name,
        title=order.title,
        description=order.description,
        status=order.status,
        delivery_method=order.delivery_method,
        due_date=order.due_date,
        delivered_date=order.delivered_date,
        abono_image_url=order.abono_image_url,
        items=[schemas.OrderItemOut(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        ) for item in order.items],
        receipts=receipts,
        **totals
    )


@app.patch("/orders/{code}", response_model=schemas.OrderOut)
def update_order(
    code: str,
    payload: schemas.OrderUpdate = Body(None),
    db: Session = Depends(get_db)
):
    # Log de inicio de PATCH
    logger.info(f"[PATCH /orders/{code}] Nuevo estado: {payload.status if payload else order.status}")
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    data = payload.model_dump(exclude_unset=True) if payload else {}

    # Normalizar abono_image_url en actualizaciones: convertir "" a None
    if "abono_image_url" in data and not data.get("abono_image_url"):
        data["abono_image_url"] = None

    if not data:
        return order

    # Lógica especial: si el status cambia a "entregado" y no se especifica delivered_date
    if "status" in data:
        if data["status"] == "entregado":
            if "delivered_date" not in data or data["delivered_date"] is None:
                data["delivered_date"] = date.today()
                logger.info(f"[PATCH /orders/{code}] Auto-estableciendo delivered_date: {data['delivered_date']}")
            # Limpiar ready_date si pasa a entregado
            data["ready_date"] = None
        elif data["status"] == "listo":
            # Si pasa a 'listo', registrar ready_date si no existe
            if not order.ready_date:
                data["ready_date"] = date.today()
                logger.info(f"[PATCH /orders/{code}] Auto-estableciendo ready_date: {data['ready_date']}")
        else:
            # Si el status cambia a algo diferente de "entregado" o "listo", limpiar delivered_date y ready_date
            data["delivered_date"] = None
            data["ready_date"] = None
            logger.info(f"[PATCH /orders/{code}] Limpiando delivered_date y ready_date porque status != 'entregado' ni 'listo'")
        # Los estados pre-pedido, recibido, diseño, producción no requieren lógica especial de fechas

    # Actualizar campos simples
    for field, value in data.items():
        if field != "items":
            setattr(order, field, value)
    
    # Hacer commit de los cambios simples
    db.commit()

    # Actualizar ítems si vienen en el payload
    if "items" in data:
        new_items = data["items"]
        # Eliminar ítems existentes
        db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).delete()
        db.commit()
        # Agregar nuevos ítems
        for item in new_items:
            order_item = models.OrderItem(
                order_id=order.id,
                description=item["description"] if isinstance(item, dict) else item.description,
                quantity=item["quantity"] if isinstance(item, dict) else item.quantity,
                due_date=item.get("due_date") if isinstance(item, dict) else item.due_date
            )
            db.add(order_item)
        db.commit()

    db.refresh(order)
    
    # Calcular totales y construir response manualmente
    totals = calculate_order_totals(order)
    receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
    return schemas.OrderOut(
        id=order.id,
        code=order.code,
        client_name=order.client_name,
        title=order.title,
        description=order.description,
        status=order.status,
        delivery_method=order.delivery_method,
        due_date=order.due_date,
        delivered_date=order.delivered_date,
        abono_image_url=order.abono_image_url,
        items=[schemas.OrderItemOut(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        ) for item in order.items],
        receipts=receipts,
        **totals
    )


@app.delete("/orders/{code}", status_code=204)
def delete_order(code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(order)
    db.commit()
    return Response(status_code=204)