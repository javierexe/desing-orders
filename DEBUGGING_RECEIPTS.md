# 🔍 Guía de Debugging - Comprobantes no aparecen

## Problema
Los clientes suben comprobantes pero no aparecen en Supabase ni en la aplicación.

## ✅ Verificado hasta ahora
1. **Configuración de Supabase**: ✅ Correcta
   - Bucket `receipts` existe
   - Variables de entorno cargadas correctamente
   - Test de subida manual funciona

2. **Código**: ✅ Actualizado con logs detallados

## 🔎 Pasos para debugging

### 1. Preparar el entorno

**Backend:**
```bash
cd /Users/javier/repos/desing-orders
make backend
```

**Frontend (en otra terminal):**
```bash
cd /Users/javier/repos/desing-orders
make frontend
```

### 2. Abrir consola del navegador
1. Abre Chrome/Firefox DevTools (F12)
2. Ve a la pestaña **Console**
3. Limpia la consola (icono 🚫 o Clear console)

### 3. Reproducir el problema
1. Pide al cliente que **cree un nuevo pedido** o **edite uno existente**
2. Que **suba un comprobante** (arrastra, pega, o selecciona archivo)
3. Que **guarde el pedido**

### 4. Revisar logs

#### 📱 Frontend (Consola del navegador)
Busca estos logs:

```
📤 [processFiles] Subiendo archivo: ...
📡 [processFiles] Response status: 200 OK
✅ [processFiles] Upload response: { url: "...", storage_key: "..." }
🏗️ [processFiles] Processed result: { ... }

💾 [handleSubmit] PERSISTIENDO COMPROBANTES
   Orden: OT-XXX
   Total comprobantes: X
   Comprobantes a persistir (sin id): X
   
📤 [handleSubmit] Guardando comprobante en BD:
   Filename: ...
   URL: ...
   Storage key: comprobantes/...
   
📡 [handleSubmit] Response status: 201 Created
✅ [handleSubmit] Comprobante guardado en BD: { id: X, ... }

✅ [handleSubmit] PERSISTENCIA COMPLETADA
   Comprobantes guardados: X/X
```

#### 🖥️ Backend (Terminal)
Busca estos logs:

```
================================================================================
🔄 UPLOAD REQUEST: filename.jpg, image/jpeg
================================================================================

📖 Reading file contents...
📏 File size: 12345 bytes
☁️ Uploading to Supabase Storage...
   🪣 Bucket name: receipts
✅ Supabase upload successful!
   📍 URL: https://...
   🔑 Storage key: comprobantes/...

================================================================================

💾 CREATE RECEIPT REQUEST for order: OT-XXX
   URL: https://...
   Filename: ...
   Storage key: comprobantes/...
================================================================================

✅ Order found: OT-XXX (ID: X)
✅ Receipt created successfully!
   ID: X
   Order ID: X
   URL: https://...
```

### 5. Identificar el problema

#### ❌ Si no aparece el log de subida (frontend)
**Problema**: El archivo no se está enviando al backend
- Verificar que el dropzone/input file funciona
- Verificar eventos de drag & drop o paste
- Ver errores en la consola

#### ❌ Si aparece error 500 en el upload
**Problema**: Supabase no está aceptando la subida
- Verificar en logs del backend el error específico
- Posibles causas:
  - Bucket no existe
  - Permisos incorrectos en Supabase
  - Límite de almacenamiento alcanzado
  - Archivo muy grande (> 5MB)

#### ❌ Si el upload funciona pero falla la persistencia en BD
**Problema**: El comprobante se sube a Supabase pero no se guarda en PostgreSQL
- Buscar en logs del backend el error al crear receipt
- Verificar que el endpoint `/api/orders/{code}/receipts` existe
- Verificar que la tabla `order_receipts` existe en la BD

#### ❌ Si todo parece funcionar pero no se ve en la UI
**Problema**: Los comprobantes se guardan pero no se muestran
- Verificar que `order.receipts` incluye los comprobantes al cargar la orden
- Verificar el endpoint `/api/orders/{code}/receipts` (GET)
- Verificar que el modal carga `order.receipts` correctamente

### 6. Verificar en Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Storage** → **receipts** → **comprobantes/**
4. ¿Aparecen los archivos recién subidos?

### 7. Verificar en Base de Datos

```sql
-- Ver comprobantes recientes
SELECT 
    o.code,
    o.client_name,
    r.id,
    r.filename,
    r.url,
    r.storage_key,
    r.uploaded_at
FROM order_receipts r
JOIN orders o ON o.id = r.order_id
ORDER BY r.uploaded_at DESC
LIMIT 20;
```

## 🚨 Errores comunes

### Error: "Bucket 'receipts' NOT FOUND"
**Solución**: Crear el bucket en Supabase
```bash
cd backend
python3 fix_supabase_bucket.py
```

### Error: "Address already in use" (puerto 8000)
**Solución**: Matar el proceso
```bash
lsof -ti:8000 | xargs kill -9
```

### Error: No aparecen los comprobantes en edición
**Solución**: Verificar que el endpoint GET devuelve los receipts:
```bash
curl http://localhost:8000/api/orders/OT-XXX/receipts
```

## 📋 Checklist de verificación

- [ ] Backend corriendo sin errores
- [ ] Frontend corriendo sin errores
- [ ] Consola del navegador abierta
- [ ] Logs del backend visibles en terminal
- [ ] Variables de entorno configuradas (.env)
- [ ] Bucket `receipts` existe en Supabase
- [ ] Tabla `order_receipts` existe en PostgreSQL
- [ ] Conexión a internet funcionando

## 💡 Si todo falla

1. **Reiniciar servicios completos**:
   ```bash
   # Matar todos los procesos
   pkill -f uvicorn
   pkill -f vite
   
   # Limpiar y reiniciar
   cd /Users/javier/repos/desing-orders
   make dev
   ```

2. **Verificar que el bucket es público**:
   - En Supabase Dashboard → Storage → receipts
   - Settings → "Public bucket" debe estar activado

3. **Revisar policies de Supabase**:
   - Storage → Policies
   - Debe permitir INSERT y SELECT públicos

4. **Logs completos**:
   ```bash
   # Backend con más verbosidad
   cd backend
   uvicorn app.main:app --reload --log-level debug
   ```
