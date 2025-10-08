# ✅ PROBLEMA RESUELTO - Comprobantes que desaparecen

## 🔍 Problema identificado

Los comprobantes se subían correctamente a Supabase y se guardaban en PostgreSQL, pero **desaparecían** al refrescar o listar las órdenes.

### Causa raíz

**Error de tipo de datos**: `OrderReceiptOut` schema esperaba `datetime`, pero la BD almacena `uploaded_at` como `date`. Al serializar, Pydantic fallaba silenciosamente y omitía el comprobante.

```python
# ❌ ANTES (main.py línea 84)
receipts = [schemas.OrderReceiptOut(
    id=r.id, url=r.url, filename=r.filename, storage_key=r.storage_key, 
    uploaded_at=r.uploaded_at  # ❌ date en vez de datetime
) for r in getattr(order, "receipts", [])]

# ✅ DESPUÉS
receipts = [schemas.OrderReceiptOut(
    id=r.id, url=r.url, filename=r.filename, storage_key=r.storage_key,
    uploaded_at=datetime.combine(r.uploaded_at, datetime.min.time())  # ✅ date → datetime
) for r in getattr(order, "receipts", [])]
```

## ✅ Soluciones aplicadas

### 1. **Fix del tipo de datos** (Commit: `7ae5f6e`)
- Convertir `date` a `datetime` en endpoint GET `/orders`
- Mismo patrón que `abono_receipts.py` ya usaba correctamente

### 2. **Logging mejorado** (Commit: `8315145`)
- Logs detallados en upload de comprobantes
- Logs de persistencia en BD
- Logs en frontend (console)
- Ayuda a diagnosticar problemas futuros

### 3. **Eliminación de fallback local** (Commit: `db878bc`)
- Solo Supabase Storage (sin almacenamiento local)
- Consistencia entre desarrollo y producción
- Mensajes de error más claros

## 📋 Pasos siguientes para producción

### 1. Configurar variables de entorno en Vercel

Ve a: https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables

Agrega estas 3 variables para **Production**, **Preview** y **Development**:

```env
SUPABASE_URL=https://akwhpuuebsszexktjenk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd2hwdXVlYnNzemV4a3RqZW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDk1NjYsImV4cCI6MjA3NDY4NTU2Nn0.qP_M1ukIeQO_lTaf0CetIh6dRg2ZBNDUFNyCQSb-f5s
SUPABASE_BUCKET=receipts
```

### 2. Re-deploy en Vercel

Después de configurar las variables:
- Ve a Vercel Dashboard → Deployments
- Click en "..." del último deployment → Redeploy
- O espera a que haga auto-deploy del último push

### 3. Verificar en producción

Una vez deployado:

**a) Probar subida de comprobante:**
1. Crear o editar un pedido
2. Subir un comprobante
3. Guardar

**b) Verificar persistencia:**
1. Cerrar el modal
2. Abrir el pedido de nuevo
3. El comprobante debe aparecer ✅

**c) Revisar Supabase:**
1. Ve a https://supabase.com/dashboard
2. Storage → receipts → comprobantes/
3. Deben aparecer los archivos nuevos

### 4. Probar desde el cliente

Pide al cliente que:
1. Suba un comprobante nuevo
2. Cierre y vuelva a abrir el pedido
3. Confirme que el comprobante aparece
4. Confirme que puede ver la imagen al hacer click

## 🔧 Si aún hay problemas en producción

### Error: "SUPABASE_URL and SUPABASE_ANON_KEY must be set"

**Causa**: Variables no configuradas en Vercel

**Solución**:
1. Verificar que las 3 variables estén en Vercel Settings
2. Hacer redeploy después de agregarlas
3. Las variables solo se aplican en nuevos deployments

### Comprobantes no aparecen

**Verificar**:
1. Console del navegador → buscar errores
2. Vercel logs → buscar errores de backend
3. Supabase Storage → verificar que los archivos existan

**Logs importantes**:
```
✅ Supabase upload successful!
✅ Receipt created successfully!
```

### Archivos se suben pero no se ven

**Causa posible**: Bucket `receipts` no es público

**Solución**:
1. Supabase Dashboard → Storage → receipts
2. Settings → "Public bucket" debe estar activado ✅
3. RLS Policies deben permitir SELECT público

## 📊 Estado actual

| Componente | Estado | Notas |
|-----------|--------|-------|
| ✅ Supabase Config | OK | Bucket `receipts` existe y funciona |
| ✅ Local Development | OK | Todo funciona correctamente |
| ✅ Upload to Supabase | OK | Archivos se suben correctamente |
| ✅ Save to Database | OK | Receipts se guardan en PostgreSQL |
| ✅ Display receipts | OK | Fix aplicado (date → datetime) |
| ⚠️ Production (Vercel) | Pendiente | Falta configurar variables de entorno |

## 🎯 Siguiente acción

**Tu responsabilidad**:
1. Agregar las 3 variables de entorno en Vercel
2. Re-deploy la aplicación
3. Probar en producción
4. Confirmar con el cliente

**Tiempo estimado**: 5-10 minutos

¿Todo claro? 🚀
