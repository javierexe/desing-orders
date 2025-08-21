from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Literal
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException


app = FastAPI(title="Design Orders API")

OrderStatus = Literal["recibido", "en_progreso", "en_espera_cliente", "aprobado", "listo", "entregado","cancelado"]
Delivery = Literal["retiro", "despacho"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OrderIn(BaseModel):
    code: str
    client_name: str
    title: str
    delivery_method: Delivery
    due_date: date | None = None
    description: str | None = None

class OrderOut(OrderIn):
    status: OrderStatus = "recibido"

class StatusPatch(BaseModel):
    status: OrderStatus

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

@app.patch("/orders/{code}/status", response_model=OrderOut)
def update_status(code: str, payload: StatusPatch):
    # busca el pedido en memoria
    for i, o in enumerate(_DB):
        if o.code == code:
            # actualiza el estado
            updated = o.model_copy(update={"status": payload.status})
            _DB[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Pedido no encontrado")