# -----------------------------------------
# Design Orders - Makefile (LAN ready)
# -----------------------------------------

.PHONY: help backend frontend dev stop ip

# Detecta IP local (macOS primero; fallback Linux)
IP := $(shell ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}' || echo "127.0.0.1")

BACKEND_HOST ?= 0.0.0.0
BACKEND_PORT ?= 8000
FRONT_HOST   ?= 0.0.0.0
FRONT_PORT   ?= 5173

help:
	@echo ""
	@echo "Comandos:"
	@echo "  make backend   -> FastAPI en http://$(IP):$(BACKEND_PORT)"
	@echo "  make frontend  -> Vite    en http://$(IP):$(FRONT_PORT)"
	@echo "  make dev       -> ambos en paralelo (Ctrl+C para salir)"
	@echo "  make stop      -> detener procesos (uvicorn/vite)"
	@echo "  make ip        -> muestra tu IP LAN detectada"
	@echo ""

ip:
	@echo "Tu IP LAN parece ser: $(IP)"

backend:
	@echo ">> Iniciando backend en http://$(IP):$(BACKEND_PORT) ..."
	cd backend && source ../.venv/bin/activate && uvicorn app.main:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT)

frontend:
	@echo ">> Iniciando frontend en http://$(IP):$(FRONT_PORT) ..."
	# --host permite acceso desde la LAN; --port fija el puerto
	cd frontend && npm run dev -- --host $(FRONT_HOST) --port $(FRONT_PORT)

dev:
	@echo ">> Iniciando backend + frontend (Ctrl+C para salir)"
	@echo "   Backend:  http://$(IP):$(BACKEND_PORT)"
	@echo "   Frontend: http://$(IP):$(FRONT_PORT)"
	@bash -lc 'trap "kill 0" INT TERM EXIT; \
		( cd backend && source ../.venv/bin/activate && uvicorn app.main:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT) ) & \
		( cd frontend && npm run dev -- --host $(FRONT_HOST) --port $(FRONT_PORT) ) & \
		wait'

stop:
	@echo ">> Intentando detener uvicorn y vite..."
	-@pkill -f "uvicorn app.main:app" || true
	-@pkill -f "vite" || true
	@echo "✓ Listo"
