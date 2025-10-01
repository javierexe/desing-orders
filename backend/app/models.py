from sqlalchemy import Column, Integer, String, Text, text, Date, ForeignKey
from sqlalchemy.orm import relationship
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
    status = Column(String(20), nullable=False, default="pre-pedido")  # pre-pedido|recibido|diseño|producción|listo|entregado|cancelado
    delivery_method = Column(String(20), nullable=False, default="retiro")
    due_date = Column(Date, nullable=True)
    delivered_date = Column(Date, nullable=True)  # Fecha cuando fue entregado
    ready_date = Column(Date, nullable=True)  # Fecha cuando pasó a 'listo'
    abono_image_url = Column(String(255), nullable=True)  # URL del comprobante de abono
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    # Receipts: múltiples comprobantes asociados a la orden
    receipts = relationship("OrderReceipt", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    due_date = Column(Date, nullable=True)
    price = Column(Integer, nullable=False, default=0)  # Precio del item en pesos chilenos
    paid_amount = Column(Integer, nullable=False, default=0)  # Monto abonado en pesos chilenos

    order = relationship("Order", back_populates="items")


class OrderReceipt(Base):
    __tablename__ = "order_receipts"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=True)
    storage_key = Column(String(255), nullable=True)  # Supabase Storage path
    uploaded_at = Column(Date, nullable=False)

    order = relationship("Order", back_populates="receipts")
