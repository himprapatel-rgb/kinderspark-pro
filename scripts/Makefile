# KinderSpark Pro — Deployment Makefile
# Usage: make setup | make deploy | make seed | make status | make open

.PHONY: setup deploy deploy-backend deploy-frontend seed status open logs health

setup:
	@echo "🚀 Full Railway setup..."
	@bash scripts/setup-railway.sh

deploy: deploy-backend deploy-frontend
	@echo "✅ Both services deployed"

deploy-backend:
	@echo "⚙️  Deploying backend..."
	@cd backend && railway up --service kinderspark-backend --detach
	@echo "✅ Backend deploying"

deploy-frontend:
	@echo "🌐 Deploying frontend..."
	@cd frontend && railway up --service kinderspark-frontend --detach
	@echo "✅ Frontend deploying"

seed:
	@echo "🌱 Seeding database..."
	@railway run --service kinderspark-backend npx prisma db seed
	@echo "✅ Database seeded"

status:
	@echo "📊 Railway project status:"
	@railway status

open:
	@railway open

logs-backend:
	@railway logs --service kinderspark-backend

logs-frontend:
	@railway logs --service kinderspark-frontend

health:
	@BACKEND=$$(railway domain --service kinderspark-backend 2>/dev/null); \
	curl -sf "https://$$BACKEND/health" && echo "✅ Backend healthy" || echo "❌ Backend not ready"

migrate:
	@echo "🔄 Running migrations..."
	@railway run --service kinderspark-backend npx prisma migrate deploy
	@echo "✅ Migrations complete"

shell-backend:
	@railway shell --service kinderspark-backend

shell-frontend:
	@railway shell --service kinderspark-frontend

local:
	@echo "🐳 Starting local dev stack..."
	@docker-compose up

local-stop:
	@docker-compose down
