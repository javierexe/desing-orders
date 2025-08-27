from fastapi import FastAPI, Depends, HTTPException, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from .db import SessionLocal
from . import models, schemas

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
    return db.query(models.Order).order_by(models.Order.id.desc()).all()

@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # ⚠️ Ya no revisamos code, la BD lo maneja.
    # Creamos el objeto sin 'code'
    order = models.Order(**payload.model_dump(exclude={"code"}))
    db.add(order)
    db.commit()
    db.refresh(order)  # aquí ya viene con el code generado por la BD
    return order


@app.patch("/orders/{code}", response_model=schemas.OrderOut)
def update_order(
    code: str, 
    payload: schemas.OrderUpdate = Body(None),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    data = payload.model_dump(exclude_unset=True) if payload else {}
    if status is not None:
        data["status"] = status

    if not data:
        return order

    for field, value in data.items():
        setattr(order, field, value)

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