from fastapi import FastAPI, Depends, HTTPException, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from .db import SessionLocal
from . import models, schemas
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

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

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    return db.query(models.Order).options(joinedload(models.Order.items)).order_by(models.Order.id.desc()).all()

@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # ⚠️ Ya no revisamos code, la BD lo maneja.
    # Creamos el objeto sin 'code'
    items_data = payload.items if hasattr(payload, "items") else []
    order = models.Order(**payload.model_dump(exclude={"code", "items"}))
    db.add(order)
    db.commit()
    db.refresh(order)

    # Crear los ítems asociados
    for item in items_data:
        order_item = models.OrderItem(
            order_id=order.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date
        )
        db.add(order_item)
    db.commit()
    db.refresh(order)
    return order


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

    if not data:
        return order

    # Actualizar campos simples
    for field, value in data.items():
        if field != "items":
            setattr(order, field, value)

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
    return order


@app.delete("/orders/{code}", status_code=204)
def delete_order(code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(order)
    db.commit()
    return Response(status_code=204)