SHELL := /bin/zsh
export PATH := $(HOME)/.local/bin:$(HOME)/.nvm/versions/node/v23.11.0/bin:$(PATH)

ifneq (,$(wildcard ./.env))
	include .env
endif

export

BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 5173

.PHONY: dev
dev: kill
	@echo "Starting backend on port $(BACKEND_PORT)..."
	cd backend && uv run python main.py > /tmp/backend.log 2>&1 &
	@echo "Waiting for backend to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
		if curl -s http://localhost:$(BACKEND_PORT)/api/health > /dev/null 2>&1; then \
			echo "Backend ready."; \
			break; \
		fi; \
		sleep 1; \
	done
	@echo "Starting frontend on port $(FRONTEND_PORT)..."
	cd frontend && npm run dev > /tmp/frontend.log 2>&1 &
	@sleep 2
	@echo ""
	@echo "Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "Logs:     tail -f /tmp/backend.log /tmp/frontend.log"

.PHONY: kill
kill:
	@-lsof -ti :$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "Cleared ports $(BACKEND_PORT) and $(FRONTEND_PORT)."

.PHONY: install
install:
	uv sync
	cd frontend && npm install

.PHONY: run
run:
	uv run chatbot.py

.PHONY: format
format:
	uv run ruff format .

.PHONY: format-check
format-check:
	uv run ruff format . --check

.PHONY: lint
lint:
	uv run ruff check .

.PHONY: lint-fix
lint-fix:
	uv run ruff check . --fix
