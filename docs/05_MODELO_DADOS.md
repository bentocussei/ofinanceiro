# O Financeiro — Modelo de Dados (Schema SQL)

**Versão:** 1.0
**Data:** 2026-03-28
**Motor:** PostgreSQL 16 + pgvector

---

## 1. Extensões Necessárias

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Encriptação
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector (embeddings)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Pesquisa fuzzy
```

---

## 2. Tipos Enumerados

```sql
-- Tipos de conta
CREATE TYPE account_type AS ENUM (
    'bank',              -- Conta bancária
    'digital_wallet',    -- Multicaixa Express, é-Kwanza, etc.
    'cash',              -- Dinheiro físico
    'savings',           -- Poupança
    'investment',        -- Investimento
    'credit_card',       -- Cartão de crédito
    'loan'               -- Empréstimo (saldo negativo)
);

-- Tipos de transacção
CREATE TYPE transaction_type AS ENUM ('expense', 'income', 'transfer');

-- Tipos de categoria
CREATE TYPE category_type AS ENUM ('expense', 'income', 'both');

-- Moedas suportadas
CREATE TYPE currency_code AS ENUM ('AOA', 'USD', 'EUR', 'MZN', 'CVE');

-- Métodos de orçamento
CREATE TYPE budget_method AS ENUM (
    'category',      -- Limite por categoria
    'fifty_thirty_twenty',  -- 50/30/20
    'envelope',      -- Envelopes
    'flex',          -- Total sem categorias
    'zero_based'     -- Zero-based
);

-- Período de orçamento
CREATE TYPE budget_period AS ENUM ('weekly', 'biweekly', 'monthly', 'custom');

-- Estado de meta
CREATE TYPE goal_status AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- Tipo de dívida
CREATE TYPE debt_type AS ENUM (
    'mortgage',       -- Crédito habitação
    'car_loan',       -- Crédito automóvel
    'personal_loan',  -- Empréstimo pessoal
    'credit_card',    -- Cartão de crédito
    'informal',       -- Dívida informal (amigo/família)
    'other'
);

-- Papel no agregado familiar
CREATE TYPE family_role AS ENUM ('admin', 'adult', 'dependent');

-- Plano de subscrição
CREATE TYPE subscription_plan AS ENUM ('free', 'personal', 'family', 'family_plus');

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM (
    'budget_alert',      -- Alerta de orçamento
    'bill_reminder',     -- Factura próxima
    'smart_insight',     -- Insight proactivo da IA
    'weekly_summary',    -- Resumo semanal
    'monthly_summary',   -- Resumo mensal
    'goal_milestone',    -- Marco de meta atingido
    'unusual_spending',  -- Gasto incomum
    'family_contribution', -- Contribuição familiar
    'manual_reminder',   -- Lembrete criado pelo utilizador
    'streak',            -- Streak de registo
    'debt_due'           -- Prestação a vencer
);

-- Tipo de facto (memória IA)
CREATE TYPE fact_type AS ENUM (
    'salary_day',         -- Dia do salário
    'salary_amount',      -- Valor do salário
    'num_children',       -- Número de filhos
    'primary_bank',       -- Banco principal
    'rent_amount',        -- Valor da renda
    'employer',           -- Empregador
    'spending_pattern',   -- Padrão de gasto
    'preference',         -- Preferência do utilizador
    'life_event',         -- Evento de vida
    'custom'              -- Facto personalizado
);

-- Fonte do facto
CREATE TYPE fact_source AS ENUM (
    'user_stated',     -- Utilizador disse explicitamente
    'inferred',        -- IA inferiu dos dados
    'recurring_detected', -- Detectado por recorrência
    'onboarding'       -- Recolhido no onboarding
);

-- Role na conversa
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
```

---

## 3. Tabelas

### 3.1 Users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   TEXT,                              -- bcrypt hash
    name            VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    currency_default currency_code NOT NULL DEFAULT 'AOA',
    country         VARCHAR(2) NOT NULL DEFAULT 'AO',  -- ISO 3166-1 alpha-2
    language        VARCHAR(5) NOT NULL DEFAULT 'pt-AO', -- BCP 47
    plan            subscription_plan NOT NULL DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    salary_day      SMALLINT CHECK (salary_day BETWEEN 1 AND 31),
    month_start_day SMALLINT NOT NULL DEFAULT 1,       -- Dia de início do mês financeiro
    preferences     JSONB NOT NULL DEFAULT '{}',
    -- preferences: {
    --   "ai_personality": "balanced",    -- balanced | casual | formal | coach
    --   "ai_proactivity": "moderate",    -- minimal | moderate | intense
    --   "ai_detail_level": "balanced",   -- brief | balanced | detailed
    --   "celebrations": true,
    --   "theme": "system"                -- light | dark | system
    -- }
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

### 3.2 Accounts

```sql
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,              -- "BAI - Conta Corrente"
    type            account_type NOT NULL,
    currency        currency_code NOT NULL DEFAULT 'AOA',
    balance         DECIMAL(15,2) NOT NULL DEFAULT 0,
    icon            VARCHAR(10),                        -- Emoji: 🏦
    color           VARCHAR(7),                         -- Hex: #4CAF50
    institution     VARCHAR(100),                       -- "BAI", "BFA", "Multicaixa Express"
    account_number  TEXT,                               -- Encriptado, opcional
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    is_shared       BOOLEAN NOT NULL DEFAULT false,     -- Conta partilhada (família)
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_family ON accounts(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX idx_accounts_active ON accounts(user_id, is_archived) WHERE is_archived = false;
```

### 3.3 Categories

```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = sistema
    parent_id       UUID REFERENCES categories(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    icon            VARCHAR(10),                        -- Emoji
    color           VARCHAR(7),
    type            category_type NOT NULL DEFAULT 'expense',
    is_system       BOOLEAN NOT NULL DEFAULT false,     -- Categorias pré-definidas
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_system ON categories(is_system) WHERE is_system = true;
```

### 3.4 Transactions

```sql
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    
    amount          DECIMAL(15,2) NOT NULL,
    type            transaction_type NOT NULL,
    description     TEXT,
    merchant        VARCHAR(200),
    
    -- Localização (opcional)
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    
    -- Anexos
    receipt_url     TEXT,                               -- URL da foto do recibo
    
    -- Metadata
    tags            TEXT[] DEFAULT '{}',
    is_recurring    BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule JSONB,
    -- recurrence_rule: {
    --   "frequency": "monthly",           -- daily | weekly | monthly | yearly
    --   "interval": 1,
    --   "day_of_month": 5,
    --   "end_date": null
    -- }
    
    -- Família
    needs_review    BOOLEAN NOT NULL DEFAULT false,
    is_private      BOOLEAN NOT NULL DEFAULT false,     -- Esconder da família
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    
    notes           TEXT,
    
    -- Datas
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Para sync offline
    client_id       UUID,                               -- ID gerado no cliente
    synced_at       TIMESTAMPTZ
);

-- Índices de performance
CREATE INDEX idx_txn_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_txn_account ON transactions(account_id, transaction_date DESC);
CREATE INDEX idx_txn_category ON transactions(category_id, transaction_date DESC);
CREATE INDEX idx_txn_user_category_date ON transactions(user_id, category_id, transaction_date DESC);
CREATE INDEX idx_txn_family_member ON transactions(family_member_id) WHERE family_member_id IS NOT NULL;
CREATE INDEX idx_txn_recurring ON transactions(user_id, is_recurring) WHERE is_recurring = true;
CREATE INDEX idx_txn_review ON transactions(user_id, needs_review) WHERE needs_review = true;
CREATE INDEX idx_txn_merchant ON transactions USING gin(merchant gin_trgm_ops);  -- Pesquisa fuzzy
CREATE INDEX idx_txn_tags ON transactions USING gin(tags);
CREATE INDEX idx_txn_client_id ON transactions(client_id) WHERE client_id IS NOT NULL;  -- Dedup sync

-- Constraint: client_id único por user (previne duplicados de sync)
CREATE UNIQUE INDEX idx_txn_client_unique ON transactions(user_id, client_id) WHERE client_id IS NOT NULL;
```

### 3.5 Budgets e Budget Items

```sql
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
    name            VARCHAR(100),
    method          budget_method NOT NULL DEFAULT 'category',
    period_type     budget_period NOT NULL DEFAULT 'monthly',
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    total_limit     DECIMAL(15,2),                      -- Para flex/50-30-20
    rollover        BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budgets_user ON budgets(user_id, period_start DESC);
CREATE INDEX idx_budgets_active ON budgets(user_id, is_active) WHERE is_active = true;

CREATE TABLE budget_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id       UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount    DECIMAL(15,2) NOT NULL,
    rollover_amount DECIMAL(15,2) NOT NULL DEFAULT 0,   -- Transitado do mês anterior
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_items_budget ON budget_items(budget_id);
CREATE UNIQUE INDEX idx_budget_items_unique ON budget_items(budget_id, category_id);
```

### 3.6 Goals

```sql
CREATE TABLE goals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id           UUID REFERENCES families(id) ON DELETE SET NULL,
    name                VARCHAR(100) NOT NULL,
    type                VARCHAR(50) NOT NULL DEFAULT 'savings',
    -- types: savings, emergency_fund, purchase, travel, event, education, retirement, custom
    icon                VARCHAR(10),
    color               VARCHAR(7),
    target_amount       DECIMAL(15,2) NOT NULL,
    current_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency            currency_code NOT NULL DEFAULT 'AOA',
    target_date         DATE,
    monthly_contribution DECIMAL(15,2),
    auto_contribute     BOOLEAN NOT NULL DEFAULT false,
    auto_contribute_day SMALLINT,                       -- Dia do mês para contribuição automática
    status              goal_status NOT NULL DEFAULT 'active',
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON goals(user_id, status);

-- Contribuições para metas (tracking individual em metas familiares)
CREATE TABLE goal_contributions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          DECIMAL(15,2) NOT NULL,
    note            TEXT,
    contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_contrib ON goal_contributions(goal_id, contributed_at DESC);
```

### 3.7 Debts

```sql
CREATE TABLE debts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,              -- "Crédito Habitação BAI"
    type            debt_type NOT NULL,
    creditor        VARCHAR(200),                       -- "BAI", "João Silva"
    original_amount DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    currency        currency_code NOT NULL DEFAULT 'AOA',
    interest_rate   DECIMAL(5,2),                       -- Taxa anual %
    monthly_payment DECIMAL(15,2),
    payment_day     SMALLINT,                           -- Dia do vencimento
    start_date      DATE,
    expected_end_date DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_user ON debts(user_id, is_active);

-- Pagamentos de dívida (histórico)
CREATE TABLE debt_payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    amount          DECIMAL(15,2) NOT NULL,
    principal       DECIMAL(15,2),                      -- Parte do capital
    interest        DECIMAL(15,2),                      -- Parte dos juros
    payment_date    DATE NOT NULL,
    transaction_id  UUID REFERENCES transactions(id),   -- Link à transacção
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debt_payments ON debt_payments(debt_id, payment_date DESC);
```

### 3.8 Families

```sql
CREATE TABLE families (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL DEFAULT 'A Minha Família',
    admin_user_id   UUID NOT NULL REFERENCES users(id),
    contribution_model JSONB NOT NULL DEFAULT '{"type": "equal"}',
    -- contribution_model: 
    --   {"type": "equal"}                               -- 50/50
    --   {"type": "percentage", "splits": {"user1": 60, "user2": 40}}
    --   {"type": "fixed", "amounts": {"user1": 200000, "user2": 150000}}
    --   {"type": "proportional"}                        -- Proporcional ao salário
    invite_code     VARCHAR(20) UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE family_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            family_role NOT NULL DEFAULT 'adult',
    display_name    VARCHAR(100),                       -- Nome visível na família
    is_active       BOOLEAN NOT NULL DEFAULT true,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_family_member_unique ON family_members(family_id, user_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);

-- Convites pendentes
CREATE TABLE family_invites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    invited_by      UUID NOT NULL REFERENCES users(id),
    invite_phone    VARCHAR(20),
    invite_email    VARCHAR(255),
    role            family_role NOT NULL DEFAULT 'adult',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, expired
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.9 Chat e Memória IA

```sql
-- Histórico de conversas
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id      VARCHAR(100) NOT NULL,               -- Agrupa mensagens da mesma sessão
    role            chat_role NOT NULL,
    content         TEXT NOT NULL,
    agent           VARCHAR(50),                         -- Agente que respondeu
    tool_calls      JSONB,                               -- Tools invocadas pelo LLM
    tool_results    JSONB,                               -- Resultados das tools
    model           VARCHAR(100),                        -- Modelo usado
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_user_session ON chat_messages(user_id, session_id, created_at);
CREATE INDEX idx_chat_user_recent ON chat_messages(user_id, created_at DESC);

-- Memória de factos (Camada 2)
CREATE TABLE user_facts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fact_type       fact_type NOT NULL,
    fact_key        VARCHAR(100) NOT NULL,               -- Chave específica: "salary_amount"
    fact_value      TEXT NOT NULL,                        -- Valor: "450000"
    confidence      REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    source          fact_source NOT NULL,
    source_detail   TEXT,                                -- "Conversa de 2026-03-15"
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facts_user ON user_facts(user_id, is_active);
CREATE UNIQUE INDEX idx_facts_unique ON user_facts(user_id, fact_key) WHERE is_active = true;

-- Memória semântica (Camada 3) — Embeddings
CREATE TABLE user_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,                        -- Texto original
    embedding       vector(1536) NOT NULL,               -- text-embedding-3-small = 1536 dims
    metadata        JSONB NOT NULL DEFAULT '{}',          -- {source: "chat", date: "2026-03-15"}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_user ON user_embeddings(user_id);
-- Índice HNSW para busca de vizinhos mais próximos
CREATE INDEX idx_embeddings_vector ON user_embeddings 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
```

### 3.10 Notificações

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB DEFAULT '{}',                  -- Dados extra (deep link, etc.)
    is_read         BOOLEAN NOT NULL DEFAULT false,
    is_pushed       BOOLEAN NOT NULL DEFAULT false,      -- Enviada via push?
    push_sent_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notif_user_recent ON notifications(user_id, created_at DESC);

-- Preferências de notificação
CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    push_enabled    BOOLEAN NOT NULL DEFAULT true,
    email_enabled   BOOLEAN NOT NULL DEFAULT false,
    in_app_enabled  BOOLEAN NOT NULL DEFAULT true,
    quiet_start     TIME,                                -- Início do período silêncio
    quiet_end       TIME,                                -- Fim do período silêncio
    UNIQUE(user_id, type)
);

-- Push tokens (FCM/APNS)
CREATE TABLE push_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL,
    platform        VARCHAR(10) NOT NULL,                -- ios, android, web
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_user ON push_tokens(user_id, is_active) WHERE is_active = true;
```

### 3.11 Padrões Recorrentes

```sql
CREATE TABLE recurring_patterns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id),
    merchant        VARCHAR(200),
    description     TEXT,
    avg_amount      DECIMAL(15,2) NOT NULL,
    min_amount      DECIMAL(15,2),
    max_amount      DECIMAL(15,2),
    frequency       VARCHAR(20) NOT NULL,                -- daily, weekly, monthly, yearly
    day_of_month    SMALLINT,
    occurrences     INTEGER NOT NULL DEFAULT 0,          -- Quantas vezes detectado
    last_seen       DATE,
    confirmed       BOOLEAN NOT NULL DEFAULT false,      -- Utilizador confirmou?
    auto_create     BOOLEAN NOT NULL DEFAULT false,      -- Criar automaticamente?
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_user ON recurring_patterns(user_id);
```

### 3.12 Investimentos (P2)

```sql
CREATE TABLE investments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(50) NOT NULL,                -- deposit, bond, stock, crypto, real_estate
    institution     VARCHAR(100),
    currency        currency_code NOT NULL DEFAULT 'AOA',
    invested_amount DECIMAL(15,2) NOT NULL,
    current_value   DECIMAL(15,2) NOT NULL,
    interest_rate   DECIMAL(5,2),
    start_date      DATE,
    maturity_date   DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investments_user ON investments(user_id, is_active);
```

### 3.13 Subscrições e Billing

```sql
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            subscription_plan NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, expired, trial
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

---

## 4. Seed Data — Categorias Angola

```sql
-- Categorias de sistema (is_system = true, user_id = NULL)
-- Inserir após criação das tabelas

INSERT INTO categories (id, parent_id, name, icon, type, is_system, sort_order) VALUES
-- DESPESAS - Categorias principais
('cat-alim', NULL, 'Alimentação', '🍽️', 'expense', true, 1),
('cat-casa', NULL, 'Casa', '🏠', 'expense', true, 2),
('cat-trans', NULL, 'Transporte', '🚗', 'expense', true, 3),
('cat-filhos', NULL, 'Filhos', '👶', 'expense', true, 4),
('cat-saude', NULL, 'Saúde', '💊', 'expense', true, 5),
('cat-pessoal', NULL, 'Pessoal', '👔', 'expense', true, 6),
('cat-lazer', NULL, 'Lazer', '🎉', 'expense', true, 7),
('cat-comms', NULL, 'Comunicações', '📱', 'expense', true, 8),
('cat-educ', NULL, 'Educação', '🎓', 'expense', true, 9),
('cat-transf', NULL, 'Transferências', '💸', 'expense', true, 10),
('cat-imposto', NULL, 'Impostos e Governo', '📋', 'expense', true, 11),
('cat-negocio', NULL, 'Negócio', '🏢', 'expense', true, 12),

-- DESPESAS - Subcategorias Alimentação
('cat-alim-super', 'cat-alim', 'Supermercado', NULL, 'expense', true, 1),
('cat-alim-mercado', 'cat-alim', 'Mercado informal', NULL, 'expense', true, 2),
('cat-alim-rest', 'cat-alim', 'Restaurante', NULL, 'expense', true, 3),
('cat-alim-take', 'cat-alim', 'Take-away / Delivery', NULL, 'expense', true, 4),
('cat-alim-padaria', 'cat-alim', 'Padaria', NULL, 'expense', true, 5),
('cat-alim-bebidas', 'cat-alim', 'Bebidas', NULL, 'expense', true, 6),

-- DESPESAS - Subcategorias Casa
('cat-casa-renda', 'cat-casa', 'Renda / Prestação', NULL, 'expense', true, 1),
('cat-casa-cond', 'cat-casa', 'Condomínio', NULL, 'expense', true, 2),
('cat-casa-agua', 'cat-casa', 'Água (EPAL)', NULL, 'expense', true, 3),
('cat-casa-luz', 'cat-casa', 'Electricidade (ENDE/EDEL)', NULL, 'expense', true, 4),
('cat-casa-gas', 'cat-casa', 'Gás', NULL, 'expense', true, 5),
('cat-casa-net', 'cat-casa', 'Internet', NULL, 'expense', true, 6),
('cat-casa-empregada', 'cat-casa', 'Empregada doméstica', NULL, 'expense', true, 7),
('cat-casa-manut', 'cat-casa', 'Manutenção / Reparações', NULL, 'expense', true, 8),
('cat-casa-mobil', 'cat-casa', 'Mobiliário e decoração', NULL, 'expense', true, 9),
('cat-casa-limpeza', 'cat-casa', 'Produtos de limpeza', NULL, 'expense', true, 10),

-- DESPESAS - Subcategorias Transporte
('cat-trans-gasola', 'cat-trans', 'Gasóleo / Gasolina', NULL, 'expense', true, 1),
('cat-trans-cand', 'cat-trans', 'Candongueiro / Kupapata', NULL, 'expense', true, 2),
('cat-trans-taxi', 'cat-trans', 'Táxi / HEETCH / Kubinga', NULL, 'expense', true, 3),
('cat-trans-manut', 'cat-trans', 'Manutenção automóvel', NULL, 'expense', true, 4),
('cat-trans-seguro', 'cat-trans', 'Seguro automóvel', NULL, 'expense', true, 5),
('cat-trans-estac', 'cat-trans', 'Estacionamento', NULL, 'expense', true, 6),
('cat-trans-lavagem', 'cat-trans', 'Lavagem automóvel', NULL, 'expense', true, 7),

-- DESPESAS - Subcategorias Filhos
('cat-filhos-propina', 'cat-filhos', 'Propina escolar', NULL, 'expense', true, 1),
('cat-filhos-material', 'cat-filhos', 'Material escolar', NULL, 'expense', true, 2),
('cat-filhos-uniforme', 'cat-filhos', 'Uniforme', NULL, 'expense', true, 3),
('cat-filhos-extra', 'cat-filhos', 'Actividades extra', NULL, 'expense', true, 4),
('cat-filhos-mesada', 'cat-filhos', 'Mesada', NULL, 'expense', true, 5),
('cat-filhos-roupa', 'cat-filhos', 'Roupa (filhos)', NULL, 'expense', true, 6),
('cat-filhos-saude', 'cat-filhos', 'Saúde (filhos)', NULL, 'expense', true, 7),
('cat-filhos-lazer', 'cat-filhos', 'Brinquedos / Lazer', NULL, 'expense', true, 8),

-- DESPESAS - Subcategorias Transferências
('cat-transf-familia', 'cat-transf', 'Transferência para família', NULL, 'expense', true, 1),
('cat-transf-ajuda', 'cat-transf', 'Ajuda financeira', NULL, 'expense', true, 2),
('cat-transf-kixikila', 'cat-transf', 'Kixikila (contribuição)', NULL, 'expense', true, 3),

-- RECEITAS
('cat-rec', NULL, 'Receitas', '💵', 'income', true, 20),
('cat-rec-salario', 'cat-rec', 'Salário', NULL, 'income', true, 1),
('cat-rec-extra', 'cat-rec', 'Rendimento extra', NULL, 'income', true, 2),
('cat-rec-freelance', 'cat-rec', 'Freelance', NULL, 'income', true, 3),
('cat-rec-vendas', 'cat-rec', 'Vendas', NULL, 'income', true, 4),
('cat-rec-rendas', 'cat-rec', 'Rendas recebidas', NULL, 'income', true, 5),
('cat-rec-juros', 'cat-rec', 'Juros / Rendimentos', NULL, 'income', true, 6),
('cat-rec-presentes', 'cat-rec', 'Presentes recebidos', NULL, 'income', true, 7),
('cat-rec-kixikila', 'cat-rec', 'Kixikila (recebimento)', NULL, 'income', true, 8);
```

---

## 5. Views Úteis

```sql
-- Saldo total por utilizador (todas as contas)
CREATE VIEW v_user_balance AS
SELECT 
    user_id,
    currency,
    SUM(CASE WHEN type IN ('bank','digital_wallet','cash','savings') THEN balance ELSE 0 END) as assets,
    SUM(CASE WHEN type IN ('credit_card','loan') THEN ABS(balance) ELSE 0 END) as liabilities,
    SUM(CASE WHEN type IN ('bank','digital_wallet','cash','savings') THEN balance 
             WHEN type IN ('credit_card','loan') THEN -ABS(balance) ELSE 0 END) as net_worth
FROM accounts
WHERE is_archived = false
GROUP BY user_id, currency;

-- Gastos do mês actual por categoria
CREATE VIEW v_monthly_spending AS
SELECT 
    t.user_id,
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    DATE_TRUNC('month', t.transaction_date) as month,
    SUM(t.amount) as total,
    COUNT(*) as count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense'
GROUP BY t.user_id, c.id, c.name, c.icon, DATE_TRUNC('month', t.transaction_date);
```

---

## 6. Funções de Utilidade

```sql
-- Actualizar saldo da conta após inserção/edição de transacção
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts SET 
            balance = balance + CASE 
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'expense' THEN -NEW.amount
                ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts SET 
            balance = balance - CASE 
                WHEN OLD.type = 'income' THEN OLD.amount
                WHEN OLD.type = 'expense' THEN -OLD.amount
                ELSE 0 END,
            updated_at = NOW()
        WHERE id = OLD.account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverter antigo
        UPDATE accounts SET balance = balance - CASE 
            WHEN OLD.type = 'income' THEN OLD.amount
            WHEN OLD.type = 'expense' THEN -OLD.amount
            ELSE 0 END
        WHERE id = OLD.account_id;
        -- Aplicar novo
        UPDATE accounts SET 
            balance = balance + CASE 
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'expense' THEN -NEW.amount
                ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas as tabelas com updated_at
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_debts_updated BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
