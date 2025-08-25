# app/schemas.py
from pydantic import BaseModel, field_validator, ConfigDict
from typing import Literal, Optional
from datetime import date

class OrderBase(BaseModel):
    client_name: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "recibido"
    delivery_method: Literal["retiro", "despacho"]
    due_date: Optional[date] = None

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
    @field_validator("due_date", mode="before")
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
    description: Optional[str] = None
    status: Optional[str] = None

    @field_validator("client_name", "title", "description", mode="before")
    @classmethod
    def _strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v

    @field_validator("due_date", mode="before")
    @classmethod
    def _empty_date_to_none(cls, v):
        return None if v == "" else v

class OrderOut(OrderBase):
    id: int
    code: str
    status: str  # en la respuesta lo exigimos no-nulo

    # Pydantic v2: usa model_config en lugar de Config
    model_config = ConfigDict(from_attributes=True)

