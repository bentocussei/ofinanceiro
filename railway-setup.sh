#!/bin/bash

# =========================================
# O Financeiro - Railway Setup Script
# =========================================
# Este script configura o projecto Railway com dois ambientes:
#   - production (branch: main)
#   - staging    (branch: staging)
#
# Cada ambiente tem: API (FastAPI), Web (Next.js), PostgreSQL, Redis
#
# Git Flow:
#   dev (desenvolvimento) → staging (testes, Railway) → main (produção, Railway)
#   Feature branches criadas a partir de dev
#
# Pré-requisitos:
# 1. Railway CLI instalado: npm install -g @railway/cli
# 2. Login feito: railway login
# 3. Repo no GitHub com branches: main, staging, dev
#
# Uso:
#   ./railway-setup.sh              # Configura ambos os ambientes
#   ./railway-setup.sh production   # Configura só production
#   ./railway-setup.sh staging      # Configura só staging
# =========================================

set -e

TARGET_ENV="${1:-all}"

echo "🚀 O Financeiro - Railway Setup"
echo "================================"
echo "Ambiente(s): $TARGET_ENV"
echo ""

# =========================================
# VERIFICAÇÕES
# =========================================
echo "📋 Verificando autenticação..."
if ! railway whoami > /dev/null 2>&1; then
    echo "❌ Não autenticado. Execute: railway login"
    exit 1
fi
echo "✅ Autenticado como: $(railway whoami)"
echo ""

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# =========================================
# FUNÇÕES AUXILIARES
# =========================================

set_env_vars() {
    local vars="$1"
    echo "$vars" | while IFS= read -r line; do
        if [ -n "$line" ] && [[ ! "$line" =~ ^# ]]; then
            railway variables set "$line" 2>/dev/null || true
        fi
    done
}

setup_environment() {
    local ENV_NAME="$1"       # production | staging
    local GIT_BRANCH="$2"    # main | staging
    local API_DOMAIN="$3"    # api.ofinanceiro.ao | api-staging.ofinanceiro.ao
    local WEB_DOMAIN="$4"    # app.ofinanceiro.ao | app-staging.ofinanceiro.ao
    local API_URL="https://$API_DOMAIN"
    local WEB_URL="https://$WEB_DOMAIN"

    echo ""
    echo "========================================="
    echo "📦 Configurando ambiente: $ENV_NAME"
    echo "   Branch: $GIT_BRANCH"
    echo "   API: $API_URL"
    echo "   Web: $WEB_URL"
    echo "========================================="
    echo ""

    # -----------------------------------------
    # Criar/Seleccionar ambiente
    # -----------------------------------------
    cd "$BASE_DIR"

    if [ "$ENV_NAME" = "production" ]; then
        # Production é o ambiente default do projecto
        if [ ! -f ".railway/config.json" ]; then
            railway init --name ofinanceiro
            echo "✅ Projecto criado"
        else
            echo "⏭️  Projecto já existe"
        fi
    fi

    # Criar ambiente (staging) se não for production
    if [ "$ENV_NAME" != "production" ]; then
        railway environment create "$ENV_NAME" 2>/dev/null || echo "⏭️  Ambiente $ENV_NAME pode já existir"
    fi

    # Seleccionar ambiente
    railway environment "$ENV_NAME" 2>/dev/null || true
    echo "✅ Ambiente $ENV_NAME seleccionado"
    echo ""

    # -----------------------------------------
    # PostgreSQL
    # -----------------------------------------
    echo "🐘 Adicionando PostgreSQL ($ENV_NAME)..."
    railway add --service postgres 2>/dev/null || echo "⏭️  PostgreSQL pode já existir"
    echo ""

    # -----------------------------------------
    # Redis
    # -----------------------------------------
    echo "🔴 Adicionando Redis ($ENV_NAME)..."
    railway add --service redis 2>/dev/null || echo "⏭️  Redis pode já existir"
    echo ""

    # -----------------------------------------
    # API (FastAPI)
    # -----------------------------------------
    echo "⚡ Configurando API ($ENV_NAME)..."
    railway service create ofinanceiro-api 2>/dev/null || echo "⏭️  Serviço pode já existir"
    railway link ofinanceiro-api 2>/dev/null || true

    echo "  📝 Configurando variáveis de ambiente..."
    set_env_vars "ENVIRONMENT=$ENV_NAME
PORT=8000
ALLOWED_ORIGINS=$WEB_URL
RATE_LIMIT_PER_MINUTE=100
CHAT_RATE_LIMIT_PER_MINUTE=20
RAILWAY_HEALTHCHECK_PATH=/health
ROOT_PATH=/apps/api"

    echo "✅ API configurado ($ENV_NAME)"
    echo ""

    # -----------------------------------------
    # Web (Next.js)
    # -----------------------------------------
    echo "🌐 Configurando Web ($ENV_NAME)..."
    railway service create ofinanceiro-web 2>/dev/null || echo "⏭️  Serviço pode já existir"
    railway link ofinanceiro-web 2>/dev/null || true

    echo "  📝 Configurando variáveis de ambiente..."
    set_env_vars "NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=$WEB_URL
NEXT_PUBLIC_API_URL=$API_URL
ROOT_PATH=/apps/web"

    echo "✅ Web configurado ($ENV_NAME)"
    echo ""

    echo "✅ Ambiente $ENV_NAME completo!"
}

# =========================================
# EXECUTAR SETUP
# =========================================

if [ "$TARGET_ENV" = "all" ] || [ "$TARGET_ENV" = "production" ]; then
    setup_environment "production" "main" "api.ofinanceiro.ao" "app.ofinanceiro.ao"
fi

if [ "$TARGET_ENV" = "all" ] || [ "$TARGET_ENV" = "staging" ]; then
    setup_environment "staging" "staging" "api-staging.ofinanceiro.ao" "app-staging.ofinanceiro.ao"
fi

# =========================================
# RESUMO FINAL
# =========================================
echo ""
echo "========================================="
echo "🎉 Setup Completo!"
echo "========================================="
echo ""
echo "Ambientes configurados:"
echo ""
echo "  PRODUCTION (branch: main)"
echo "    ofinanceiro-api  → https://api.ofinanceiro.ao"
echo "    ofinanceiro-web  → https://app.ofinanceiro.ao"
echo "    PostgreSQL + Redis"
echo ""
echo "  STAGING (branch: staging)"
echo "    ofinanceiro-api  → https://api-staging.ofinanceiro.ao"
echo "    ofinanceiro-web  → https://app-staging.ofinanceiro.ao"
echo "    PostgreSQL + Redis"
echo ""
echo "========================================="
echo "Próximos passos manuais:"
echo "========================================="
echo ""
echo "1. Conectar repo GitHub ao projecto Railway:"
echo "   railway connect <github-user>/ofinanceiro"
echo ""
echo "2. Configurar branches por ambiente no Railway Dashboard:"
echo "   - production → branch: main"
echo "   - staging    → branch: staging"
echo "   - dev NÃO tem deploy (desenvolvimento local apenas)"
echo ""
echo "3. Configurar segredos em CADA ambiente:"
echo ""
echo "   # Seleccionar ambiente primeiro"
echo "   railway environment production"
echo ""
echo "   # API secrets"
echo "   railway variables set JWT_SECRET=\$(openssl rand -hex 32)"
echo "   railway variables set JWT_REFRESH_SECRET=\$(openssl rand -hex 32)"
echo "   railway variables set ANTHROPIC_API_KEY=<sua_chave>"
echo "   railway variables set OPENAI_API_KEY=<sua_chave>"
echo ""
echo "   # Web secrets"
echo "   railway variables set NEXTAUTH_SECRET=\$(openssl rand -hex 32)"
echo ""
echo "   # Repetir para staging:"
echo "   railway environment staging"
echo "   # ... (mesmos comandos, chaves diferentes)"
echo ""
echo "4. Configurar domínios customizados (por ambiente):"
echo ""
echo "   # Production"
echo "   railway environment production"
echo "   railway domain add api.ofinanceiro.ao     # serviço: ofinanceiro-api"
echo "   railway domain add app.ofinanceiro.ao     # serviço: ofinanceiro-web"
echo ""
echo "   # Staging"
echo "   railway environment staging"
echo "   railway domain add api-staging.ofinanceiro.ao"
echo "   railway domain add app-staging.ofinanceiro.ao"
echo ""
echo "5. Configurar DNS:"
echo "   api.ofinanceiro.ao          → CNAME → <railway-domain>"
echo "   app.ofinanceiro.ao          → CNAME → <railway-domain>"
echo "   api-staging.ofinanceiro.ao  → CNAME → <railway-domain>"
echo "   app-staging.ofinanceiro.ao  → CNAME → <railway-domain>"
echo ""
echo "6. Criar branch dev no Git (se ainda não existe):"
echo "   git checkout -b dev"
echo "   git push -u origin dev"
echo ""
echo "7. CI/CD automático:"
echo "   Push para 'staging' → deploy automático em staging"
echo "   Push para 'main'    → deploy automático em production"
echo "   Branch 'dev'        → sem deploy (desenvolvimento local)"
echo ""
echo "8. Git Flow:"
echo "   feature branch → PR para dev → merge dev → staging → main"
echo ""
