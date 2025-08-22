from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class OrderBase(BaseModel):
    code: str
    client_name: str
    title: str
    description: Optional[str] = None
    status: str = "recibido"
    delivery_method: str = "retiro"
    due_date: Optional[date] = None

class OrderCreate(OrderBase):
    pass

class OrderOut(OrderBase):
    id: int
    class Config:
        from_attributes = True  # Pydantic v2
