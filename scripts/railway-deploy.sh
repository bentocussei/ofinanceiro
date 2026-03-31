#!/bin/bash
# Railway deployment script for O Financeiro
# Usage: cd apps/api && railway up  (for API)
#        cd apps/web && railway up  (for Web)
#
# Prerequisites:
# 1. railway login
# 2. railway init (create project "ofinanceiro")
# 3. Add PostgreSQL and Redis via Railway dashboard
# 4. Set environment variables via Railway dashboard or CLI
#
# The recommended approach is to connect the GitHub repo in Railway dashboard:
# - Go to railway.app → project → New Service → GitHub Repo
# - Select bentocussei/ofinanceiro
# - Set root directory: apps/api (for API) or apps/web (for Web)
# - Railway auto-detects Dockerfile and deploys on push
#
# Environment variables to set in Railway:
#
# === API Service ===
# DATABASE_URL          → auto-injected by Railway PostgreSQL
# REDIS_URL             → auto-injected by Railway Redis
# ENVIRONMENT           → production
# DEBUG                 → false
# JWT_SECRET            → $(openssl rand -hex 32)
# JWT_REFRESH_SECRET    → $(openssl rand -hex 32)
# ALLOWED_ORIGINS       → https://ofinanceiro.ao,https://app.ofinanceiro.ao
# ANTHROPIC_API_KEY     → sk-ant-...
# OPENAI_API_KEY        → sk-...
# TWILIO_ACCOUNT_SID    → AC...
# TWILIO_AUTH_TOKEN      → ...
# TWILIO_PHONE_NUMBER   → +244...
# STRIPE_SECRET_KEY     → sk_live_...
# STRIPE_WEBHOOK_SECRET → whsec_...
#
# === Web Service ===
# NEXT_PUBLIC_API_URL   → https://api-ofinanceiro.up.railway.app (internal Railway URL)
# NODE_ENV              → production

set -e

echo "=== O Financeiro — Railway Deploy ==="
echo ""

# Check if linked
if ! railway status > /dev/null 2>&1; then
    echo "ERROR: Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

echo "Railway project linked. Current status:"
railway status
echo ""

echo "=== Setup Steps ==="
echo ""
echo "1. Go to railway.app dashboard"
echo "2. Add services:"
echo "   - PostgreSQL (click + New → Database → PostgreSQL)"
echo "   - Redis (click + New → Database → Redis)"
echo "   - API (click + New → GitHub Repo → bentocussei/ofinanceiro, root: apps/api)"
echo "   - Web (click + New → GitHub Repo → bentocussei/ofinanceiro, root: apps/web)"
echo ""
echo "3. Set environment variables (see comments in this script)"
echo ""
echo "4. Railway will auto-deploy on push to the connected branch"
echo ""
echo "=== Done ==="
