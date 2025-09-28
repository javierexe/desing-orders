from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, date
from .db import SessionLocal
from . import models, schemas

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/orders/{code}/receipts", response_model=list[schemas.OrderReceiptOut])
def list_receipts(code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time())) for r in order.receipts]


@router.post("/orders/{code}/receipts", response_model=schemas.OrderReceiptOut, status_code=201)
def create_receipt(code: str, payload: schemas.OrderReceiptCreate = Body(...), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    # Crear receipt
    r = models.OrderReceipt(order_id=order.id, url=payload.url, filename=payload.filename, uploaded_at=date.today())
    db.add(r)
    db.commit()
    db.refresh(r)
    return schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time()))


@router.delete("/orders/{code}/receipts/{receipt_id}", status_code=204)
def delete_receipt(code: str, receipt_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    r = db.query(models.OrderReceipt).filter(models.OrderReceipt.id == receipt_id, models.OrderReceipt.order_id == order.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    db.delete(r)
    db.commit()
    return None
