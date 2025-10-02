# Configuración Vercel para Design Orders

## Frontend (React/Vite)
- Auto-deploy desde `frontend/`
- Build command: `npm run build`
- Output directory: `dist`

## Backend (FastAPI)
- Serverless functions
- Python runtime
- API routes bajo `/api`

## Variables de entorno necesarias:
- DATABASE_URL
- SUPABASE_URL  
- SUPABASE_ANON_KEY