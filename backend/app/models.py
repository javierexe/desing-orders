from sqlalchemy import Column, Integer, String, Text, Date
from .db import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    client_name = Column(String(200), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, default="recibido")  # recibido|en_proceso|listo|entregado
    delivery_method = Column(String(20), nullable=False, default="retiro")
    due_date = Column(Date, nullable=True)
