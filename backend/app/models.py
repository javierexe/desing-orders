from sqlalchemy import Column, Integer, String, Text, text, Date
from .db import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(
        String,
        nullable=False,
        unique=True,
        server_default=text("'OT-' || LPAD(nextval('order_code_seq')::text, 3, '0')")
    )
    client_name = Column(String(200), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="recibido")  # recibido|en_proceso|listo|entregado
    delivery_method = Column(String(20), nullable=False, default="retiro")
    due_date = Column(Date, nullable=True)
