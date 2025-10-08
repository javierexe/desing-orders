from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, date
from .db import SessionLocal
from . import models, schemas
from .supabase_storage import get_supabase_storage

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
    return [schemas.OrderReceiptOut(
        id=r.id, 
        url=r.url, 
        filename=r.filename, 
        storage_key=r.storage_key,
        uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time())
    ) for r in order.receipts]


@router.post("/orders/{code}/receipts", response_model=schemas.OrderReceiptOut, status_code=201)
def create_receipt(code: str, payload: schemas.OrderReceiptCreate = Body(...), db: Session = Depends(get_db)):
    print(f"\n{'='*80}")
    print(f"💾 CREATE RECEIPT REQUEST for order: {code}")
    print(f"   URL: {payload.url}")
    print(f"   Filename: {payload.filename}")
    print(f"   Storage key: {payload.storage_key}")
    print(f"{'='*80}\n")
    
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        print(f"❌ Order not found: {code}")
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    print(f"✅ Order found: {order.code} (ID: {order.id})")
    
    # Crear receipt
    r = models.OrderReceipt(
        order_id=order.id, 
        url=payload.url, 
        filename=payload.filename,
        storage_key=payload.storage_key,
        uploaded_at=date.today()
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    
    print(f"✅ Receipt created successfully!")
    print(f"   ID: {r.id}")
    print(f"   Order ID: {r.order_id}")
    print(f"   URL: {r.url}")
    print(f"\n{'='*80}\n")
    
    return schemas.OrderReceiptOut(
        id=r.id, 
        url=r.url, 
        filename=r.filename, 
        storage_key=r.storage_key,
        uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time())
    )


@router.delete("/orders/{code}/receipts/{receipt_id}", status_code=204)
def delete_receipt(code: str, receipt_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    r = db.query(models.OrderReceipt).filter(
        models.OrderReceipt.id == receipt_id, 
        models.OrderReceipt.order_id == order.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    
    # Si el archivo está en Supabase, intentar eliminarlo
    if r.storage_key:
        try:
            storage = get_supabase_storage()
            storage.delete_file(r.storage_key)
        except Exception as e:
            print(f"Error deleting file from Supabase: {e}")
    
    db.delete(r)
    db.commit()
    return None
