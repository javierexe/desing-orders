# -----------------------------------------
# Design Orders - Makefile (simple)
# -----------------------------------------

.PHONY: help backend frontend dev stop

help:
	@echo ""
	@echo "Comandos:"
	@echo "  make backend   -> inicia FastAPI en http://localhost:8000"
	@echo "  make frontend  -> inicia Vite en   http://localhost:5173"
	@echo "  make dev       -> levanta ambos en paralelo (Ctrl+C para salir)"
	@echo "  make stop      -> intenta detener procesos (uvicorn/vite)"
	@echo ""

backend:
	@echo ">> Iniciando backend en http://localhost:8000 ..."
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	@echo ">> Iniciando frontend en http://localhost:5173 ..."
	cd frontend && npm run dev

dev:
	@echo ">> Iniciando backend + frontend (Ctrl+C para salir)"
	@bash -lc 'trap "kill 0" INT TERM EXIT; \
		( cd backend && uvicorn app.main:app --reload --port 8000 ) & \
		( cd frontend && npm run dev ) & \
		wait'

stop:
	@echo ">> Intentando detener uvicorn y vite..."
	-@pkill -f "uvicorn app.main:app" || true
	-@pkill -f "vite" || true
	@echo "✓ Listo"