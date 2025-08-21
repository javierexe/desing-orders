from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Literal
from datetime import date

app = FastAPI(title="Design Orders API")

OrderStatus = Literal["recibido", "en_progreso", "en_espera_cliente", "aprovado", "listo", "entregado","cancelado"]
Delivery = Literal["retiro", "despacho"]

class OrderIn(BaseModel):
    code: str
    client_name: str
    title: str
    delivery_method: Delivery
    due_date: date | None = None
    description: str | None = None

class OrderOut(OrderIn):
    status: OrderStatus = "recibido"

_DB: List[OrderOut] = []

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/orders", response_model=List[OrderOut])
def get_orders():
    return _DB

@app.post("/orders", response_model=OrderOut, status_code=201)
def create_order(order: OrderIn):
    new_order = OrderOut(**order.model_dump(), id=len(_DB) + 1, created_at=date.today())
    _DB.append(new_order)
    return new_order