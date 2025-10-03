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
    price: int = 0  # Precio en pesos chilenos
    paid_amount: int = 0  # Monto abonado en pesos chilenos

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
    total_price: Optional[int] = None  # Suma de precios de todos los items en pesos chilenos
    total_paid: Optional[int] = None   # Suma de abonos de todos los items en pesos chilenos
    pending_amount: Optional[int] = None  # Diferencia entre total_price y total_paid en pesos chilenos

    # Pydantic v2: usa model_config en lugar de Config
    model_config = ConfigDict(from_attributes=True)


# Schemas para comprobantes
class OrderReceiptBase(BaseModel):
    url: str
    filename: Optional[str] = None
    storage_key: Optional[str] = None  # Supabase Storage path

class OrderReceiptCreate(OrderReceiptBase):
    pass

class OrderReceiptOut(OrderReceiptBase):
    id: int
    uploaded_at: datetime

OrderBase.model_rebuild()


# ==================== CATEGORIAS ====================
class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    icono: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    id: int
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)


# ==================== PRODUCTOS ====================
class ProductoBase(BaseModel):
    nombre: str
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    presentacion: Optional[str] = None
    precio_base: Optional[int] = None  # Precio en pesos chilenos
    requiere_cotizacion: bool = False
    unidad_medida: Optional[str] = None
    tags: Optional[List[str]] = []
    especificaciones: Optional[dict] = None  # JSONB field

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    presentacion: Optional[str] = None
    precio_base: Optional[int] = None
    requiere_cotizacion: Optional[bool] = None
    unidad_medida: Optional[str] = None
    tags: Optional[List[str]] = None
    especificaciones: Optional[dict] = None
    activo: Optional[bool] = None

class ProductoOut(ProductoBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime
    categoria: Optional[CategoriaOut] = None  # Relación con categoría
    
    model_config = ConfigDict(from_attributes=True)


# ==================== CLIENTES ====================
class ClienteBase(BaseModel):
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    rut: Optional[str] = None
    tipo: Literal["particular", "empresa"] = "particular"
    preferencias: Optional[dict] = None  # JSONB field

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    rut: Optional[str] = None
    tipo: Optional[Literal["particular", "empresa"]] = None
    preferencias: Optional[dict] = None
    activo: Optional[bool] = None

class ClienteOut(ClienteBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

