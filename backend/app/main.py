from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .db import SessionLocal, engine, Base
from . import models, schemas

app = FastAPI()

# CORS: ajusta dominios según tu front (localhost:5173, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "https://desing-orders3d-world.vercel.app/"],
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
    return db.query(models.Order).order_by(models.Order.id.desc()).all()

@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if db.query(models.Order).filter(models.Order.code == payload.code).first():
        raise HTTPException(status_code=409, detail="El código ya existe")
    order = models.Order(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@app.patch("/orders/{code}", response_model=schemas.OrderOut)
def update_status(code: str, status: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    order.status = status
    db.commit()
    db.refresh(order)
    return order
