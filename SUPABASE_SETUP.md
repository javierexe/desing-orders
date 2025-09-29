# Configuración de Supabase Storage para Comprobantes

## Setup Inicial en Supabase Dashboard

1. **Crear un proyecto en Supabase** (si no tienes uno)
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto

2. **Crear el bucket para almacenar comprobantes**
   - Ve a Storage > Buckets en el dashboard
   - Crear nuevo bucket con nombre: `order-receipts`
   - Configurar como público para que las URLs sean accesibles

3. **Configurar políticas de acceso**
   ```sql
   -- Permitir subir archivos (INSERT)
   CREATE POLICY "Allow public uploads" ON storage.objects
   FOR INSERT TO public
   WITH CHECK (bucket_id = 'order-receipts');

   -- Permitir leer archivos (SELECT)
   CREATE POLICY "Allow public read" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'order-receipts');

   -- Permitir eliminar archivos (DELETE) 
   CREATE POLICY "Allow public delete" ON storage.objects
   FOR DELETE TO public
   USING (bucket_id = 'order-receipts');
   ```

## Variables de Entorno

Crea o actualiza `backend/.env` con:

```bash
# Tu proyecto de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

## Cómo obtener las credenciales

1. En tu proyecto de Supabase, ve a Settings > API
2. **Project URL**: Copia la URL del proyecto
3. **anon/public key**: Copia la clave anónima

## Funcionamiento

- **Subida de archivos**: Se suben a Supabase Storage en `order-receipts/comprobantes/`
- **Fallback**: Si Supabase falla, se guarda localmente en `backend/uploads/comprobantes/`
- **URLs públicas**: Los archivos en Supabase son accesibles directamente por URL
- **Eliminación**: Al borrar un comprobante, se elimina también de Supabase

## Migración desde almacenamiento local

Si tienes archivos en `backend/uploads/comprobantes/`, puedes migrarlos manualmente subiendo cada uno al nuevo sistema.

## Testing

Para probar que la configuración funciona:

1. Configura las variables de entorno
2. Ejecuta el backend: `make backend`
3. Intenta subir un comprobante desde el frontend
4. Verifica que aparece en tu bucket de Supabase