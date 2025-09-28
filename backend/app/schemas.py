# app/schemas.py
from pydantic import BaseModel, field_validator, ConfigDict
from typing import Literal, Optional, List
from datetime import date
from datetime import datetime

# Esquema para ítem de pedido
class OrderItemBase(BaseModel):
    description: str
    quantity: int = 1
    due_date: Optional[date] = None
    price: int = 0  # Precio en centavos
    paid_amount: int = 0  # Monto abonado en centavos

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(OrderItemBase):
    id: int


class OrderBase(BaseModel):
    client_name: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pre-pedido"  # pre-pedido|recibido|diseño|producción|listo|entregado|cancelado
    delivery_method: Literal["retiro", "despacho"]
    due_date: Optional[date] = None
    delivered_date: Optional[date] = None
    ready_date: Optional[date] = None
    items: List[OrderItemCreate] = []
    abono_image_url: Optional[str] = None
    # Lista de comprobantes (solo para API nueva)
    receipts: Optional[List["OrderReceiptOut"]] = []

    # Limpia espacios
    @field_validator("client_name", "title", "description", mode="before")
    @classmethod
    def _strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v

    # Permite "" -> None en fecha
    @field_validator("due_date", "delivered_date", mode="before")
    @classmethod
    def _empty_date_to_none(cls, v):
        return None if v == "" else v

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    client_name: Optional[str] = None
    title: Optional[str] = None
    delivery_method: Optional[Literal["retiro", "despacho"]] = None
    due_date: Optional[date] = None
    delivered_date: Optional[date] = None
    ready_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None  # pre-pedido|recibido|diseño|producción|listo|entregado|cancelado
    items: Optional[List[OrderItemCreate]] = None
    abono_image_url: Optional[str] = None
    receipts: Optional[List["OrderReceiptCreate"]] = None

    @field_validator("client_name", "title", "description", mode="before")
    @classmethod
    def _strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v

    @field_validator("due_date", "delivered_date", mode="before")
    @classmethod
    def _empty_date_to_none(cls, v):
        return None if v == "" else v

class OrderOut(OrderBase):
    id: int
    code: str
    status: str  # pre-pedido|recibido|diseño|producción|listo|entregado|cancelado
    items: List[OrderItemOut] = []
    ready_date: Optional[date] = None
    abono_image_url: Optional[str] = None
    receipts: Optional[List["OrderReceiptOut"]] = []
    total_price: Optional[int] = None  # Suma de precios de todos los items en centavos
    total_paid: Optional[int] = None   # Suma de abonos de todos los items en centavos
    pending_amount: Optional[int] = None  # Diferencia entre total_price y total_paid en centavos

    # Pydantic v2: usa model_config en lugar de Config
    model_config = ConfigDict(from_attributes=True)


# Schemas para comprobantes
class OrderReceiptBase(BaseModel):
    url: str
    filename: Optional[str] = None

class OrderReceiptCreate(OrderReceiptBase):
    pass

class OrderReceiptOut(OrderReceiptBase):
    id: int
    uploaded_at: datetime

OrderBase.model_rebuild()

