from fastapi import FastAPI, Depends, HTTPException, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .db import SessionLocal
from . import models, schemas
from .abono_image import router as abono_image_router
from .abono_receipts import router as abono_receipts_router
from .ocr_router import router as ocr_router
import logging


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.include_router(abono_image_router)
app.include_router(abono_receipts_router)
app.include_router(ocr_router, prefix="/ocr", tags=["OCR"])

# CORS: ajusta dominios según tu front (localhost:5173, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.98:5173",
        "https://desing-orders3d-world.vercel.app",  # tu dominio de prod
    ],
    allow_origin_regex=r"https://.*\.vercel\.app$",  # habilita todos los previews de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_order_totals(order: models.Order):
    """Calcula los totales de precio, abonos y pendiente para una orden"""
    if not order.items:
        return {
            "total_price": 0,
            "total_paid": 0, 
            "pending_amount": 0
        }
    
    total_price = sum(item.price or 0 for item in order.items)
    total_paid = sum(item.paid_amount or 0 for item in order.items)
    pending_amount = total_price - total_paid
    
    return {
        "total_price": total_price,
        "total_paid": total_paid,
        "pending_amount": pending_amount
    }

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    orders = db.query(models.Order).options(
        joinedload(models.Order.items),
        joinedload(models.Order.receipts)
    ).order_by(models.Order.id.desc()).all()
    
    logger.info(f"📊 Listando {len(orders)} órdenes")
    
    # Agregar totales calculados a cada orden
    result = []
    for order in orders:
        totals = calculate_order_totals(order)
        # Map receipts if exist (convertir date a datetime)
        from datetime import datetime
        receipts = [schemas.OrderReceiptOut(
            id=r.id, 
            url=r.url, 
            filename=r.filename, 
            storage_key=r.storage_key, 
            uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time()) if r.uploaded_at else datetime.now()
        ) for r in getattr(order, "receipts", [])]
        
        logger.info(f"🧾 Orden {order.code}: {len(receipts)} receipts, {len(order.items)} items")
        if receipts:
            logger.info(f"📄 Receipts para {order.code}: {[r.filename for r in receipts]}")
        
        result.append(schemas.OrderOut(
            id=order.id,
            code=order.code,
            client_name=order.client_name,
            title=order.title,
            description=order.description,
            status=order.status,
            delivery_method=order.delivery_method,
            due_date=order.due_date,
            delivered_date=order.delivered_date,
            abono_image_url=order.abono_image_url,
            items=[schemas.OrderItemOut(
                id=item.id,
                description=item.description,
                quantity=item.quantity,
                due_date=item.due_date,
                price=item.price,
                paid_amount=item.paid_amount
            ) for item in order.items],
            receipts=receipts,
            **totals
        ))
    
    return result

@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # ⚠️ Ya no revisamos code, la BD lo maneja.
    # Creamos el objeto sin 'code'
    items_data = payload.items if hasattr(payload, "items") else []
    # Ajustar due_date a la fecha menor de los ítems si existe
    min_due = None
    if items_data:
        fechas = [item.due_date for item in items_data if item.due_date]
        if fechas:
            min_due = min(fechas)
    order_kwargs = payload.model_dump(exclude={"code", "items"})
    # Normalizar abono_image_url: guardar NULL en DB si viene vacío
    if "abono_image_url" in order_kwargs and not order_kwargs.get("abono_image_url"):
        order_kwargs["abono_image_url"] = None
    if min_due:
        order_kwargs["due_date"] = min_due
    order = models.Order(**order_kwargs)
    db.add(order)
    db.commit()
    db.refresh(order)

    # Crear los ítems asociados
    for item in items_data:
        order_item = models.OrderItem(
            order_id=order.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        )
        db.add(order_item)
    db.commit()
    
    # Recargar la orden completa con sus items y receipts
    from sqlalchemy.orm import joinedload
    order = db.query(models.Order).options(
        joinedload(models.Order.items),
        joinedload(models.Order.receipts)
    ).filter(models.Order.id == order.id).first()
    
    # Calcular totales
    totals = calculate_order_totals(order)
    
    # Map receipts
    receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
    # Construir response manualmente
    return schemas.OrderOut(
        id=order.id,
        code=order.code,
        client_name=order.client_name,
        title=order.title,
        description=order.description,
        status=order.status,
        delivery_method=order.delivery_method,
        due_date=order.due_date,
        delivered_date=order.delivered_date,
        abono_image_url=order.abono_image_url,
        items=[schemas.OrderItemOut(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        ) for item in order.items],
        receipts=receipts,
        **totals
    )


@app.patch("/orders/{code}", response_model=schemas.OrderOut)
def update_order(
    code: str,
    payload: schemas.OrderUpdate = Body(None),
    db: Session = Depends(get_db)
):
    # Log de inicio de PATCH
    logger.info(f"[PATCH /orders/{code}] Nuevo estado: {payload.status if payload else order.status}")
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    data = payload.model_dump(exclude_unset=True) if payload else {}

    # Normalizar abono_image_url en actualizaciones: convertir "" a None
    if "abono_image_url" in data and not data.get("abono_image_url"):
        data["abono_image_url"] = None

    if not data:
        return order

    # Lógica especial: si el status cambia a "entregado" y no se especifica delivered_date
    if "status" in data:
        if data["status"] == "entregado":
            if "delivered_date" not in data or data["delivered_date"] is None:
                data["delivered_date"] = date.today()
                logger.info(f"[PATCH /orders/{code}] Auto-estableciendo delivered_date: {data['delivered_date']}")
            # Limpiar ready_date si pasa a entregado
            data["ready_date"] = None
        elif data["status"] == "listo":
            # Si pasa a 'listo', registrar ready_date si no existe
            if not order.ready_date:
                data["ready_date"] = date.today()
                logger.info(f"[PATCH /orders/{code}] Auto-estableciendo ready_date: {data['ready_date']}")
        else:
            # Si el status cambia a algo diferente de "entregado" o "listo", limpiar delivered_date y ready_date
            data["delivered_date"] = None
            data["ready_date"] = None
            logger.info(f"[PATCH /orders/{code}] Limpiando delivered_date y ready_date porque status != 'entregado' ni 'listo'")
        # Los estados pre-pedido, recibido, diseño, producción no requieren lógica especial de fechas

    # Actualizar campos simples
    for field, value in data.items():
        if field != "items":
            setattr(order, field, value)
    
    # Hacer commit de los cambios simples
    db.commit()

    # Actualizar ítems si vienen en el payload
    if "items" in data:
        new_items = data["items"]
        logger.info(f"[PATCH /orders/{code}] Actualizando {len(new_items)} items")
        for i, item in enumerate(new_items):
            if isinstance(item, dict):
                logger.info(f"[PATCH /orders/{code}] Item {i}: desc='{item.get('description')}', price={item.get('price', 0)}, paid_amount={item.get('paid_amount', 0)}")
            else:
                logger.info(f"[PATCH /orders/{code}] Item {i}: desc='{item.description}', price={getattr(item, 'price', 0)}, paid_amount={getattr(item, 'paid_amount', 0)}")
        
        # Eliminar ítems existentes
        db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).delete()
        db.commit()
        # Agregar nuevos ítems
        for item in new_items:
            order_item = models.OrderItem(
                order_id=order.id,
                description=item["description"] if isinstance(item, dict) else item.description,
                quantity=item["quantity"] if isinstance(item, dict) else item.quantity,
                due_date=item.get("due_date") if isinstance(item, dict) else item.due_date,
                price=item.get("price", 0) if isinstance(item, dict) else getattr(item, 'price', 0),
                paid_amount=item.get("paid_amount", 0) if isinstance(item, dict) else getattr(item, 'paid_amount', 0)
            )
            db.add(order_item)
        db.commit()

    db.refresh(order)
    
    # Calcular totales y construir response manualmente
    totals = calculate_order_totals(order)
    receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
    return schemas.OrderOut(
        id=order.id,
        code=order.code,
        client_name=order.client_name,
        title=order.title,
        description=order.description,
        status=order.status,
        delivery_method=order.delivery_method,
        due_date=order.due_date,
        delivered_date=order.delivered_date,
        abono_image_url=order.abono_image_url,
        items=[schemas.OrderItemOut(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        ) for item in order.items],
        receipts=receipts,
        **totals
    )


@app.post("/orders/{code}/auto-settle", response_model=schemas.OrderOut)
def auto_settle_order(code: str, db: Session = Depends(get_db)):
    """
    Auto-liquida la deuda pendiente de un pedido al momento de entregarlo.
    Actualiza todos los items para que paid_amount = price.
    """
    logger.info(f"[POST /orders/{code}/auto-settle] Auto-liquidando deuda pendiente")
    
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Actualizar cada item para liquidar la deuda
    for item in order.items:
        if item.paid_amount < item.price:
            logger.info(f"   Item '{item.description}': ${item.paid_amount} → ${item.price}")
            item.paid_amount = item.price
    
    db.commit()
    db.refresh(order)
    
    logger.info(f"[POST /orders/{code}/auto-settle] Deuda liquidada exitosamente")
    
    # Calcular totales y construir response
    totals = calculate_order_totals(order)
    receipts = [schemas.OrderReceiptOut(id=r.id, url=r.url, filename=r.filename, uploaded_at=r.uploaded_at) for r in getattr(order, "receipts", [])]
    
    return schemas.OrderOut(
        id=order.id,
        code=order.code,
        client_name=order.client_name,
        title=order.title,
        description=order.description,
        status=order.status,
        delivery_method=order.delivery_method,
        due_date=order.due_date,
        delivered_date=order.delivered_date,
        abono_image_url=order.abono_image_url,
        items=[schemas.OrderItemOut(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            due_date=item.due_date,
            price=item.price,
            paid_amount=item.paid_amount
        ) for item in order.items],
        receipts=receipts,
        **totals
    )


@app.delete("/orders/{code}", status_code=204)
def delete_order(code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(order)
    db.commit()
    return Response(status_code=204)


# ==================== ENDPOINTS DE PRODUCTOS ====================

@app.get("/categorias", response_model=List[schemas.CategoriaOut])
def get_categorias(db: Session = Depends(get_db)):
    """Obtiene todas las categorías activas"""
    categorias = db.query(models.Categoria).filter(models.Categoria.activo == True).all()
    return categorias


@app.post("/categorias", response_model=schemas.CategoriaOut, status_code=201)
def create_categoria(payload: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    """Crea una categoría, validando duplicados por nombre case-insensitive"""
    nombre_norm = payload.nombre.strip()
    if not nombre_norm:
        raise HTTPException(status_code=400, detail="Nombre de categoría vacío")
    # Case-insensitive search
    existing = db.query(models.Categoria).filter(models.Categoria.nombre.ilike(nombre_norm)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Categoría ya existe")
    cat = models.Categoria(nombre=nombre_norm, descripcion=payload.descripcion, icono=payload.icono)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ==================== CLIENTES ====================

@app.get("/clientes", response_model=List[schemas.ClienteOut])
def get_clientes(
    search: Optional[str] = None,
    tipo: Optional[str] = None,
    activo: bool = True,
    db: Session = Depends(get_db)
):
    """
    Obtiene clientes con filtros opcionales:
    - search: busca en nombre, email, teléfono y RUT
    - tipo: filtra por tipo (particular|empresa)
    - activo: solo clientes activos (default True)
    """
    query = db.query(models.Cliente).filter(models.Cliente.activo == activo)
    
    if tipo:
        query = query.filter(models.Cliente.tipo == tipo)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.Cliente.nombre.ilike(search_pattern)) |
            (models.Cliente.email.ilike(search_pattern)) |
            (models.Cliente.telefono.ilike(search_pattern)) |
            (models.Cliente.rut.ilike(search_pattern))
        )
    
    clientes = query.order_by(models.Cliente.nombre).all()
    return clientes


@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteOut)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Obtiene un cliente por ID"""
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@app.post("/clientes", response_model=schemas.ClienteOut, status_code=201)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    """Crea un nuevo cliente"""
    # Validar RUT único si se proporciona
    if cliente.rut:
        existing = db.query(models.Cliente).filter(models.Cliente.rut == cliente.rut).first()
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese RUT")
    
    nuevo_cliente = models.Cliente(
        nombre=cliente.nombre,
        email=cliente.email,
        telefono=cliente.telefono,
        direccion=cliente.direccion,
        rut=cliente.rut,
        tipo=cliente.tipo,
        preferencias=cliente.preferencias
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente


@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteOut)
def update_cliente(cliente_id: int, cliente: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    """Actualiza un cliente existente"""
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Validar RUT único si se está cambiando
    if cliente.rut and cliente.rut != db_cliente.rut:
        existing = db.query(models.Cliente).filter(
            models.Cliente.rut == cliente.rut,
            models.Cliente.id != cliente_id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese RUT")
    
    # Actualizar solo los campos enviados
    update_data = cliente.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_cliente, field, value)
    
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


@app.delete("/clientes/{cliente_id}", status_code=204)
def delete_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Elimina (desactiva) un cliente"""
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Desactivar en lugar de eliminar
    cliente.activo = False
    db.commit()
    return Response(status_code=204)


# ==================== PRODUCTOS ====================

@app.get("/productos", response_model=List[schemas.ProductoOut])
def get_productos(
    categoria_id: Optional[int] = None,
    search: Optional[str] = None,
    activo: bool = True,
    db: Session = Depends(get_db)
):
    """
    Obtiene productos con filtros opcionales:
    - categoria_id: filtra por categoría
    - search: busca en nombre y descripción
    - activo: solo productos activos (default True)
    """
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Producto).options(joinedload(models.Producto.categoria)).filter(models.Producto.activo == activo)
    
    if categoria_id:
        query = query.filter(models.Producto.categoria_id == categoria_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.Producto.nombre.ilike(search_pattern)) |
            (models.Producto.descripcion.ilike(search_pattern))
        )
    
    productos = query.order_by(models.Producto.nombre).all()
    return productos


@app.get("/productos/{producto_id}", response_model=schemas.ProductoOut)
def get_producto(producto_id: int, db: Session = Depends(get_db)):
    """Obtiene un producto por ID"""
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@app.post("/productos", response_model=schemas.ProductoOut, status_code=201)
def create_producto(producto: schemas.ProductoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo producto"""
    nuevo_producto = models.Producto(
        nombre=producto.nombre,
        categoria_id=producto.categoria_id,
        descripcion=producto.descripcion,
        presentacion=producto.presentacion,
        precio_base=producto.precio_base,
        requiere_cotizacion=producto.requiere_cotizacion,
        unidad_medida=producto.unidad_medida,
        tags=producto.tags,
        especificaciones=producto.especificaciones
    )
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto


def generar_codigo_producto(db: Session, categoria_id: int = None):
    """Genera código único para producto tipo PAP-001 basado en categoría"""
    import time
    
    # Obtener prefijo de categoría
    prefijo = "GEN"
    if categoria_id:
        cat = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
        if cat and cat.nombre:
            prefijo = cat.nombre[:3].upper().replace(" ", "")
    
    # Contar productos con ese prefijo para obtener siguiente número
    from sqlalchemy import func
    count = db.query(func.count(models.Producto.id)).filter(
        models.Producto.codigo.like(f"{prefijo}-%")
    ).scalar() or 0
    
    # Generar código
    numero = count + 1
    codigo = f"{prefijo}-{str(numero).zfill(3)}"
    
    # Verificar unicidad (por si hay conflicto)
    max_intentos = 10
    for _ in range(max_intentos):
        existe = db.query(models.Producto).filter(models.Producto.codigo == codigo).first()
        if not existe:
            return codigo
        # Si existe, incrementar
        numero += 1
        codigo = f"{prefijo}-{str(numero).zfill(3)}"
    
    # Fallback: usar timestamp
    return f"{prefijo}-{int(time.time() % 10000)}"


@app.post("/productos/bulk", response_model=schemas.ProductoBulkUpsertResponse)
def bulk_upsert_products(payload: schemas.ProductoBulkUpsertRequest, db: Session = Depends(get_db)):
    """Realiza upsert masivo de productos y soft-deletes.
    - updates: si viene id, intenta actualizar; si no, crea.
    - deletes: lista de ids a desactivar (activo=False)
    - new_categories: lista de nombres de categoría a crear si no existen
    Todo se realiza en una transacción.
    Genera códigos automáticamente para productos nuevos.
    """
    created_categories = []
    processed_rows = []
    try:
        # Normalizar y crear new_categories primero
        for nombre in payload.new_categories or []:
            n = nombre.strip()
            if not n:
                continue
            # case-insensitive
            exist = db.query(models.Categoria).filter(models.Categoria.nombre.ilike(n)).first()
            if not exist:
                cat = models.Categoria(nombre=n)
                db.add(cat)
                db.flush()
                created_categories.append(cat)

        # Procesar updates
        for up in payload.updates or []:
            # resolver categoria_nombre a categoria_id si viene
            cat_id = up.categoria_id
            if getattr(up, 'categoria_nombre', None):
                name = up.categoria_nombre.strip()
                if name:
                    cat = db.query(models.Categoria).filter(models.Categoria.nombre.ilike(name)).first()
                    if not cat:
                        cat = models.Categoria(nombre=name)
                        db.add(cat)
                        db.flush()
                        created_categories.append(cat)
                    cat_id = cat.id

            if up.id:
                # actualizar existente
                prod = db.query(models.Producto).filter(models.Producto.id == up.id).first()
                if not prod:
                    # crear si no existe (tiene id pero no se encontró)
                    # Generar código si no viene
                    codigo = up.codigo if up.codigo else generar_codigo_producto(db, cat_id)
                    prod = models.Producto(
                        codigo=codigo,
                        nombre=up.nombre,
                        categoria_id=cat_id,
                        presentacion=up.presentacion,
                        precio_base=up.precio_base,
                        requiere_cotizacion=bool(up.requiere_cotizacion),
                        unidad_medida=up.unidad_medida,
                        descripcion=up.descripcion,
                        activo=bool(up.activo)
                    )
                    db.add(prod)
                    db.flush()
                else:
                    # Actualizar producto existente (no modificar codigo si ya existe)
                    prod.nombre = up.nombre
                    prod.categoria_id = cat_id
                    prod.presentacion = up.presentacion
                    prod.precio_base = up.precio_base
                    prod.requiere_cotizacion = bool(up.requiere_cotizacion)
                    prod.unidad_medida = up.unidad_medida
                    prod.descripcion = up.descripcion
                    prod.activo = bool(up.activo)
                    db.add(prod)
                db.flush()
                processed_rows.append(prod)
            else:
                # crear nuevo producto (sin id)
                # Generar código automáticamente
                codigo = generar_codigo_producto(db, cat_id)
                prod = models.Producto(
                    codigo=codigo,
                    nombre=up.nombre,
                    categoria_id=cat_id,
                    presentacion=up.presentacion,
                    precio_base=up.precio_base,
                    requiere_cotizacion=bool(up.requiere_cotizacion),
                    unidad_medida=up.unidad_medida,
                    descripcion=up.descripcion,
                    activo=bool(up.activo)
                )
                db.add(prod)
                db.flush()
                processed_rows.append(prod)

        # Procesar deletes como soft-delete
        for did in payload.deletes or []:
            p = db.query(models.Producto).filter(models.Producto.id == did).first()
            if p:
                p.activo = False
                db.add(p)

        db.commit()

        # Refrescar rows para devolver con relaciones
        from sqlalchemy.orm import joinedload
        result_rows = []
        for prod in processed_rows:
            r = db.query(models.Producto).options(joinedload(models.Producto.categoria)).filter(models.Producto.id == prod.id).first()
            if r:
                result_rows.append(r)

        return schemas.ProductoBulkUpsertResponse(
            rows=result_rows,
            created_categories=created_categories
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/productos/{producto_id}", response_model=schemas.ProductoOut)
def update_producto(producto_id: int, producto: schemas.ProductoUpdate, db: Session = Depends(get_db)):
    """Actualiza un producto existente"""
    db_producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Actualizar solo los campos enviados
    update_data = producto.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_producto, field, value)
    
    db.commit()
    db.refresh(db_producto)
    return db_producto


@app.delete("/productos/{producto_id}", status_code=204)
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    """Elimina (desactiva) un producto"""
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Desactivar en lugar de eliminar
    producto.activo = False
    db.commit()
    return Response(status_code=204)