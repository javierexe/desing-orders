# Design Orders - AI Agent Guide

## Architecture Overview

This is a full-stack order management system for a **design business** with a **Kanban-style workflow** to help clients manage their orders and maintain better business control:
- **Frontend**: React + Vite with drag-and-drop Kanban board using `@dnd-kit`
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (Neon cloud database)
- **Order Flow**: pre-pedido → recibido → diseño → producción → listo → entregado
- **Currency**: All financial calculations in **Chilean Pesos (CLP)**

## Key Data Model

Orders have a status-driven workflow with financial tracking in Chilean Pesos:
- `Order`: Main entity with `status`, `code` (auto-generated OT-001), `client_name`, multiple `items`
- `OrderItem`: Individual products with `price`/`paid_amount` in **centavos** (CLP cents for precision)
- `OrderReceipt`: Multiple payment proof uploads per order
- Status transitions: pre-pedido → recibido → diseño → producción → listo → entregado
- Business purpose: Client order management and business control system

## Development Workflow

### Quick Start (LAN ready)
```bash
make dev    # Starts both backend + frontend with auto-detected LAN IP
make backend # FastAPI on :8000
make frontend # Vite on :5173
```

### Database Operations
- **Migrations**: Manual scripts in `backend/migrate_*.py` (not automated framework)
- **Schema**: `backend/app/models.py` defines SQLAlchemy models
- **Connection**: Requires `backend/.env` with `DATABASE_URL` (Neon PostgreSQL)
- **File Storage**: Supabase Storage for receipts (requires `SUPABASE_URL` + `SUPABASE_ANON_KEY`)

### Frontend API Communication
- `frontend/src/lib/api.js`: Centralized HTTP client with proxy support
- Dev proxy: `/api` → backend (configurable via `VITE_PROXY_TARGET`)
- Production: Uses `VITE_API_BASE_URL` environment variable

## Critical Patterns

### Status Management
- Frontend uses normalized status keys (`pre_pedido`, `diseno`) 
- Backend expects hyphenated versions (`pre-pedido`, `diseño`)
- Mapping handled in `frontend/src/components/kanbanHelpers.js`

### Financial Calculations
- All monetary values stored as **integers** (centavos/cents) for CLP precision
- `calculate_order_totals()` in `backend/app/main.py` aggregates item pricing
- Frontend receives computed `total_price`, `total_paid`, `pending_amount` in centavos
- **Currency**: Chilean Pesos (CLP) - business operates in Chile

### File Upload Strategy
- Receipt uploads go through dedicated endpoints (`/abono-receipts/`)
- **Storage**: Supabase Storage (primary) with local fallback (`backend/uploads/comprobantes/`)
- Files stored with auto-generated UUIDs, original filename preserved in DB
- `storage_key` field tracks Supabase path for deletion

## Testing & Configuration

- Frontend tests: `npm run test` (Vitest + Testing Library)
- CORS configured for localhost:5173 + Vercel domains in `main.py`
- Environment variables: `VITE_PROXY_TARGET` for dev, `VITE_API_BASE_URL` for prod

## Common Debugging Points

1. **Database connection**: Verify `backend/.env` has correct `DATABASE_URL`
2. **Status sync issues**: Check status normalization in `kanbanHelpers.js`
3. **CORS errors**: Ensure frontend URL is in `main.py` allowed origins
4. **Migration failures**: Run individual `migrate_*.py` scripts manually
5. **File upload errors**: Check Supabase config or `backend/uploads/` permissions
6. **Supabase setup**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`, bucket `order-receipts` exists