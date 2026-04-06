# O Financeiro — Evolução Estratégica v2.0

**Data:** Abril 2026
**Estado:** Decisões Arquitecturais Aprovadas — Pronto para Implementação
**Contexto:** Este documento detalha os novos módulos, funcionalidades e decisões arquitecturais que expandem O Financeiro para além de gestão financeira pessoal convencional, adicionando funcionalidades específicas para o contexto angolano e lusófono que nenhuma app existente oferece. A versão web base já se encontra quase 100% implementada. Os módulos aqui descritos são ADIÇÕES ao que já existe — não substituições.

---

## 1. Reposicionamento Estratégico

### 1.1 O que O Financeiro NÃO é

Não é mais uma app de tracking de gastos com categorias e dashboard. Esse mercado é uma commodity — a Cleo processa 8.2 milhões de transacções diárias, tem CAC de $11, payback de 3 meses, e atingiu $280M ARR. Replicar a Cleo em português não é defensável.

### 1.2 O que O Financeiro É

Uma plataforma completa de gestão financeira pessoal e familiar para o mercado angolano e lusófono. Mantém todas as funcionalidades já implementadas (gestão de contas, transacções, categorias, orçamentos, metas, contas partilhadas para casais/famílias, dashboard) e adiciona camadas que nenhuma app existente oferece:

- **Kixikila Digital** — digitalização de poupança rotativa (ROSCA) com pagamentos reais integrados. Killer feature de aquisição com efeito de rede embutido.
- **WhatsApp como Canal** — registo de transacções por texto e voz no WhatsApp, integrado ao mesmo backend. Canal de distribuição onde os utilizadores já estão.
- **Suporte a Transacções Cash** — funcionalidade complementar para registar gastos em dinheiro físico (táxi, praça, zungueira) de forma rápida. Adição ao fluxo digital existente, não substituição. A maioria dos utilizadores-alvo é bancarizada e usa MCX/apps bancárias, mas todos operam parcialmente em cash.
- **Grafo Financeiro Familiar** — módulo adicional (não substitui contas partilhadas existentes) para modelar a realidade de quem suporta familiares, recebe remessas, empresta a primos, e contribui para kixikilas simultaneamente.
- **Forecasting para Rendimento Variável** — previsão financeira que funciona com padrões de rendimento irregulares.
- **GenAI como Motor** — sistema agêntico que potencializa categorização, insights, educação financeira contextual, e gestão inteligente de kixikilas.

> **Nota para implementação:** as funcionalidades existentes (contas, transacções, categorias, orçamentos, metas, contas partilhadas, dashboard) mantêm-se intactas. Tudo o que segue neste documento são adições ao sistema actual.

### 1.3 Mercado Endereçável

- 35 milhões de angolanos. O público-alvo primário é bancarizado (usa MCX, apps bancárias, carteiras digitais) mas sem acesso a ferramentas de gestão financeira inteligentes.
- 300M+ falantes de português globalmente
- Zero apps de finanças pessoais com IA construídas para contexto angolano/lusófono
- Referências validadas: MoneyFellows (Egipto, $60M+ funding, ROSCA digital), PiggyVest (Nigéria, 6M+ utilizadores), Cleo ($280M ARR, GenAI-first)

---

## 2. Arquitectura de Canais

### ADR-001: Canais Unificados com Backend Único

**Decisão:** O Financeiro opera através de três canais — Web, App Mobile, e WhatsApp — todos ligados ao mesmo backend. Não são produtos separados. São interfaces diferentes para o mesmo sistema.

**Contexto:** O utilizador pode iniciar uma interacção no WhatsApp ("gastei 5.000 no táxi"), ver o resultado no dashboard web, e receber uma notificação na app mobile. Os três canais partilham: a mesma base de dados, o mesmo motor de IA, o mesmo estado do utilizador, e as mesmas regras de negócio.

**Arquitectura:**

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Web App    │  │  Mobile App │  │  WhatsApp    │
│  (React)     │  │(React Native)│  │  (Bot API)  │
└──────┬───────┘  └──────┬───────┘  └──────┬──────┘
       │                 │                 │
       └────────────┬────┴────────────┬────┘
                    │                 │
              ┌─────▼─────┐   ┌──────▼──────┐
              │  API       │   │  WhatsApp   │
              │  Gateway   │   │  Adapter    │
              │ (FastAPI)  │   │  (Webhook)  │
              └─────┬──────┘   └──────┬──────┘
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Core Backend  │
                    │   (FastAPI)     │
                    ├─────────────────┤
                    │ - Auth/IAM      │
                    │ - Transactions  │
                    │ - Kixikila Eng. │
                    │ - Family Graph  │
                    │ - Forecasting   │
                    │ - AI Engine     │
                    │ - Payments Int. │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   + Redis       │
                    └─────────────────┘
```

**WhatsApp Adapter — Detalhe:**

O WhatsApp Adapter é um serviço que:
- Recebe webhooks da WhatsApp Business API (mensagens de texto, áudio, imagens)
- Converte áudio para texto via Whisper/speech-to-text (português angolano)
- Converte imagens de recibos para dados estruturados via OCR multimodal
- Encaminha o conteúdo normalizado para o Core Backend como qualquer outro canal
- Recebe resposta do Core Backend e formata para WhatsApp (texto, botões interactivos, listas)
- Suporta conversação contextual (o agente sabe o que o utilizador disse antes, independentemente do canal)

**Regras de canal:**
- Toda a lógica de negócio vive no Core Backend — nunca nos canais
- Os canais são stateless — o estado vive na base de dados
- A sessão do utilizador é cross-channel: se inicia conversa no WhatsApp e abre a app, vê o mesmo contexto
- O WhatsApp tem limitações de UI (sem gráficos complexos) — o adapter deve fornecer respostas textuais concisas e remeter para a app/web quando necessário ("Para ver o gráfico completo, abre a app")

---

## 3. Módulo: Kixikila Digital

### ADR-002: Kixikila com Pagamentos Reais Integrados

**Decisão:** A kixikila no O Financeiro opera com dinheiro real, não com registos manuais. As contribuições e os pagamentos passam por integrações com plataformas de pagamento angolanas. O utilizador não diz "paguei" — o sistema confirma que o pagamento foi efectivamente realizado.

**Contexto:** Uma kixikila baseada apenas em auto-reporte ("marquei que paguei") não resolve o problema de confiança que é a principal causa de falha de kixikilas informais. O diferencial é a confirmação de pagamento real.

**Integrações de pagamento (por prioridade):**

1. **é-Kwanza** — já existe registo, prioritária para MVP
2. **Multicaixa Express (MCX)** — pagamento por referência via EMIS
3. **Unitel Money** — carteira digital da Unitel
4. **PayPay** — agregador de pagamentos
5. **Transferência bancária** — confirmação via extracto/comprovativo (OCR como fallback)

**Fluxo de pagamento de contribuição kixikila:**

```
1. Sistema gera notificação: "A tua contribuição de 50.000 Kz para a Kixikila 
   'Amigos do Bairro' vence em 3 dias"
   
2. Utilizador escolhe método de pagamento:
   a) é-Kwanza → redirect para é-Kwanza → callback de confirmação
   b) MCX → gerar referência de pagamento → aguardar callback EMIS
   c) Unitel Money → redirect/deeplink → callback
   d) Manual → utilizador faz transferência e envia comprovativo 
      → OCR valida → administrador do grupo confirma

3. Backend recebe confirmação de pagamento:
   - Actualiza estado da contribuição para CONFIRMADO
   - Notifica todos os membros do grupo: "[Nome] pagou ✓"
   - Actualiza saldo do pool da kixikila
   - Se todos pagaram → notifica o beneficiário da vez

4. Disbursement ao beneficiário:
   - Sistema inicia transferência via a plataforma preferida do beneficiário
   - OU gera referência para levantamento
   - Confirma recepção e notifica o grupo
```

### 3.1 Modelo de Dados — Kixikila

```sql
-- Grupo de kixikila
CREATE TABLE kixikila_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) NOT NULL,
    
    -- Configuração financeira
    contribution_amount DECIMAL(15,2) NOT NULL,  -- valor fixo por membro por ciclo
    currency VARCHAR(3) DEFAULT 'AOA',
    cycle_frequency VARCHAR(20) NOT NULL,  -- 'weekly', 'biweekly', 'monthly'
    total_cycles INTEGER,  -- NULL = contínuo
    current_cycle INTEGER DEFAULT 1,
    
    -- Configuração de rotação
    rotation_type VARCHAR(20) DEFAULT 'fixed',  -- 'fixed', 'auction', 'need_based', 'random'
    rotation_order JSONB,  -- ordem pré-definida de beneficiários [user_id1, user_id2, ...]
    
    -- Estado
    status VARCHAR(20) DEFAULT 'forming',  -- 'forming', 'active', 'paused', 'completed', 'dissolved'
    start_date DATE,
    next_contribution_date DATE,
    next_payout_date DATE,
    
    -- Regras do grupo
    late_payment_grace_days INTEGER DEFAULT 3,
    late_payment_penalty_pct DECIMAL(5,2) DEFAULT 0,  -- percentagem de multa (0 = sem multa)
    min_members INTEGER DEFAULT 3,
    max_members INTEGER DEFAULT 20,
    requires_admin_approval BOOLEAN DEFAULT true,  -- novos membros precisam de aprovação
    
    -- Metadados
    invite_code VARCHAR(10) UNIQUE,  -- código curto para convites WhatsApp
    whatsapp_group_id VARCHAR(100),  -- link ao grupo WhatsApp (opcional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membros do grupo
CREATE TABLE kixikila_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES kixikila_groups(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    
    role VARCHAR(20) DEFAULT 'member',  -- 'admin', 'treasurer', 'member'
    rotation_position INTEGER,  -- posição na ordem de recebimento
    
    -- Estado do membro
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'suspended', 'removed', 'left'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Preferência de pagamento para receber o payout
    preferred_payout_method VARCHAR(30),  -- 'ekwanza', 'mcx', 'unitel_money', 'bank_transfer'
    payout_account_ref VARCHAR(100),  -- número/referência da conta para receber
    
    -- Métricas de confiança (calculadas pela IA)
    reliability_score DECIMAL(5,2) DEFAULT 100,  -- 0-100, baseado em histórico de pagamentos
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    missed_payments INTEGER DEFAULT 0,
    
    UNIQUE(group_id, user_id)
);

-- Ciclos de kixikila
CREATE TABLE kixikila_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES kixikila_groups(id) NOT NULL,
    cycle_number INTEGER NOT NULL,
    
    beneficiary_id UUID REFERENCES users(id) NOT NULL,  -- quem recebe neste ciclo
    
    -- Datas
    contribution_deadline DATE NOT NULL,
    payout_date DATE,
    
    -- Financeiro
    expected_pool DECIMAL(15,2) NOT NULL,  -- contribution_amount × num_members
    actual_pool DECIMAL(15,2) DEFAULT 0,  -- soma das contribuições recebidas
    payout_amount DECIMAL(15,2),  -- valor efectivamente pago ao beneficiário
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'collecting', 'ready_to_pay', 'paid', 'partial', 'failed'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, cycle_number)
);

-- Contribuições individuais
CREATE TABLE kixikila_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID REFERENCES kixikila_cycles(id) NOT NULL,
    member_id UUID REFERENCES kixikila_members(id) NOT NULL,
    
    amount DECIMAL(15,2) NOT NULL,
    
    -- Pagamento
    payment_method VARCHAR(30),  -- 'ekwanza', 'mcx', 'unitel_money', 'bank_transfer', 'manual'
    payment_reference VARCHAR(100),  -- referência da transacção no provider
    payment_provider_tx_id VARCHAR(100),  -- ID da transacção no provider externo
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' → aguarda pagamento
    -- 'processing' → pagamento iniciado, aguarda confirmação do provider
    -- 'confirmed' → pagamento confirmado pelo provider (automático)
    -- 'manually_confirmed' → confirmado pelo admin do grupo (fallback manual)
    -- 'late' → pago após deadline
    -- 'missed' → não pago após grace period
    
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES users(id),  -- quem confirmou (sistema ou admin)
    
    -- Comprovativo (para pagamentos manuais)
    receipt_image_url TEXT,
    ocr_extracted_data JSONB,  -- dados extraídos do comprovativo por OCR
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts ao beneficiário
CREATE TABLE kixikila_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID REFERENCES kixikila_cycles(id) NOT NULL,
    beneficiary_id UUID REFERENCES users(id) NOT NULL,
    
    amount DECIMAL(15,2) NOT NULL,
    payout_method VARCHAR(30) NOT NULL,
    payout_account_ref VARCHAR(100),
    payout_provider_tx_id VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' → aguarda todas as contribuições
    -- 'ready' → todas as contribuições confirmadas, pronto para enviar
    -- 'processing' → transferência iniciada
    -- 'completed' → beneficiário recebeu
    -- 'failed' → falha na transferência (retry automático)
    
    initiated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Funcionalidades do Módulo Kixikila

**Criação e gestão de grupo:**
- Criar kixikila com nome, valor, frequência, e regras
- Gerar código de convite curto (ex: `KIX-7A3F`) partilhável via WhatsApp
- Definir ordem de rotação (fixa, aleatória, leilão, ou por necessidade)
- Definir regras: grace period, multa por atraso, aprovação de membros
- Dashboard do grupo: quem pagou, quem falta, próximo beneficiário, histórico

**Contribuições com confirmação real:**
- Notificação automática antes do deadline (3 dias, 1 dia, dia do deadline)
- Pagamento via é-Kwanza, MCX, Unitel Money, PayPay com confirmação automática por callback
- Fallback manual: upload de comprovativo → OCR extrai dados → admin confirma
- Visualização em tempo real: cada membro vê quem já pagou e quem falta (com timestamps)
- Penalização automática configurável por atraso

**Disbursement:**
- Quando todas as contribuições estão confirmadas, sistema inicia payout automático ao beneficiário
- Notificação a todo o grupo quando o payout é concluído
- Se payout parcial (alguém não pagou), o admin decide: pagar o que há, aguardar, ou accionar multa

**IA no módulo kixikila:**
- **Detecção de risco:** identificar membros com padrão de atraso crescente e alertar o admin antes do problema
- **Sugestão de ordem óptima:** com base no perfil financeiro de cada membro (se autorizarem partilha), sugerir quem deve receber primeiro (quem mais precisa vs quem mais contribui atempadamente)
- **Relatório automático de ciclo:** no final de cada ciclo, gerar sumário partilhável no WhatsApp com estatísticas do grupo
- **Cálculo de reliability score:** score de 0-100 por membro, baseado em: percentagem de pagamentos a tempo, tempo médio de atraso, histórico de participação em múltiplas kixikilas

---

## 4. Módulo: Grafo Financeiro Familiar

### ADR-003: Modelação de Rede Financeira Familiar

**Decisão:** O Financeiro adiciona um módulo de grafo financeiro familiar como funcionalidade complementar. As contas partilhadas para casais e famílias já existentes no sistema mantêm-se intactas — funcionam e devem continuar a funcionar como estão. Este módulo é uma camada adicional para modelar relações financeiras mais complexas.

**Contexto:** Muitos utilizadores angolanos têm uma realidade financeira que vai além da conta partilhada do casal: enviam dinheiro mensal à mãe, recebem contribuição do irmão na diáspora, emprestam à prima, contribuem para a kixikila do bairro, pagam propinas do sobrinho. Este módulo modela essa rede — sem interferir com as funcionalidades de gestão familiar já implementadas.

### 4.1 Modelo de Dados

```sql
-- Relações financeiras (grafo)
CREATE TABLE family_financial_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,  -- quem regista a relação
    
    -- A outra pessoa (pode ou não ter conta no O Financeiro)
    linked_user_id UUID REFERENCES users(id),  -- se tem conta
    linked_person_name VARCHAR(100),  -- se não tem conta
    linked_person_phone VARCHAR(20),  -- para convite futuro
    
    -- Tipo de relação
    relationship_type VARCHAR(30) NOT NULL,
    -- 'parent', 'child', 'sibling', 'spouse', 'uncle_aunt', 'cousin',
    -- 'nephew_niece', 'grandparent', 'friend', 'colleague', 'other'
    
    -- Tipo de fluxo financeiro
    flow_type VARCHAR(20) NOT NULL,
    -- 'support_send' → eu envio dinheiro regularmente (ex: suporto a mãe)
    -- 'support_receive' → eu recebo dinheiro regularmente (ex: irmão manda da diáspora)
    -- 'loan_given' → emprestei dinheiro
    -- 'loan_received' → pediram-me emprestado
    -- 'shared_expense' → despesa partilhada (ex: renda com roommate)
    -- 'dependent' → esta pessoa é meu dependente financeiro
    
    -- Configuração financeira
    expected_amount DECIMAL(15,2),  -- valor esperado/habitual (mensal)
    currency VARCHAR(3) DEFAULT 'AOA',
    frequency VARCHAR(20),  -- 'weekly', 'monthly', 'irregular', 'one_time'
    
    -- Para empréstimos
    loan_total DECIMAL(15,2),
    loan_remaining DECIMAL(15,2),
    loan_due_date DATE,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacções familiares
CREATE TABLE family_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES family_financial_links(id) NOT NULL,
    transaction_id UUID REFERENCES transactions(id),  -- link à transacção principal (opcional)
    
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AOA',
    direction VARCHAR(10) NOT NULL,  -- 'sent', 'received'
    
    date DATE NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Funcionalidades

- **Visualização de rede:** dashboard visual mostrando todas as relações financeiras do utilizador com fluxos de dinheiro (quem envia, quem recebe, quanto, com que frequência)
- **Tracking de suporte familiar:** "Este mês enviaste 120.000 Kz à família (mãe: 50K, propinas do sobrinho: 40K, prima: 30K). Isto representa 28% do teu rendimento."
- **Gestão de empréstimos informais:** registar dinheiro emprestado a familiares, acompanhar pagamentos, enviar lembretes automáticos (configuráveis — o utilizador decide se quer lembrete suave ou não)
- **Dependentes financeiros:** marcar pessoas como dependentes e calcular o custo real de cada dependente por mês/ano
- **Convite para a plataforma:** se a mãe não tem conta, o utilizador regista-a como pessoa externa. Se a mãe criar conta, o link conecta automaticamente. Ambos podem ver a mesma transacção nos seus dashboards.
- **Insights de IA:** "Nos últimos 6 meses, o suporte familiar aumentou 15%. Se mantiver este ritmo, terás 40K menos para poupança no próximo trimestre."

---

## 5. Módulo: Gestão Dual-Currency

### ADR-004: Suporte Multi-Moeda (Feature Opcional — P3)

**Decisão:** O suporte multi-moeda é uma feature opcional de baixa prioridade. Angola opera em Kwanza. Quem tem USD/EUR troca para Kz e usa Kz no dia-a-dia. Ninguém vai a uma loja comprar com dólar ou euro.

**Contexto:** Existem casos pontuais onde registar uma conversão de moeda é útil (ex: "troquei $200 por 184.000 Kz"), mas não justifica infra-estrutura complexa de multi-carteira e gestão de câmbio no near-term. No MVP e nas primeiras versões, o utilizador pode registar conversões como transacção normal com nota descritiva. A implementação completa de dual-currency fica para quando houver procura real dos utilizadores.

**Implementação mínima (se necessário):**
- Campo opcional de moeda na transacção (default: AOA)
- Possibilidade de registar "troca de moeda" como tipo de transacção
- Sem infra-estrutura de múltiplas carteiras por moeda, sem tracking automático de câmbio

### 5.1 Modelo de Dados (P3 — Implementação Futura)

> **Nota para implementação:** este módulo está classificado como P3. NÃO implementar no MVP nem nas primeiras iterações. O schema abaixo é referência para implementação futura, quando houver procura real dos utilizadores. No imediato, basta adicionar um campo opcional `currency` (default 'AOA') na tabela de transacções existente.

```sql
-- Para implementação futura (P3):
-- Tabela wallets com suporte multi-moeda
-- Tabela exchange_rates para tracking de câmbio
-- Tabela currency_conversions para registar trocas
-- Ver versão anterior deste documento para schemas detalhados
```

### 5.2 Funcionalidades (P3 — Diferido)

Funcionalidades completas de dual-currency (múltiplas carteiras por moeda, conversão entre carteiras, dashboard consolidado multi-moeda, tracking de câmbio) ficam para implementação futura. No imediato, o utilizador que precisa de registar uma troca de moeda fá-lo como transacção normal.

---

## 6. Módulo: Forecasting para Rendimento Variável

### ADR-005: Previsão Financeira Adaptativa

**Decisão:** O motor de forecasting assume rendimento variável como caso base, não rendimento fixo.

**Contexto:** A maioria das apps assume "salário mensal fixo" como base do orçamento. Em Angola, muitas pessoas têm: rendimento informal variável, múltiplas fontes de rendimento, sazonalidade (ex: mais trabalho em certas épocas), pagamentos atrasados do empregador, rendimento de negócio paralelo.

### 6.1 Funcionalidades

- **Detecção automática de padrões de rendimento:** a IA analisa os últimos 3-6 meses de entradas e identifica: rendimento fixo vs variável, sazonalidade, tendência (crescente/decrescente), outliers
- **Projecção em intervalo, não ponto:** em vez de "vais receber 300K este mês", diz "com base nos últimos 4 meses, é provável que recebas entre 250-350K. No cenário pessimista (250K), tens 15K para imprevistos depois dos gastos fixos."
- **Simulação de cenários:** "Se não receberes o pagamento do cliente X este mês, consegues cobrir os gastos fixos? Sim, mas ficas sem margem para a contribuição da kixikila."
- **Alertas proactivos:** "Com base no teu padrão, a segunda quinzena costuma ter menos entradas. Tens 3 despesas grandes nos próximos 10 dias (propina: 25K, renda: 80K, kixikila: 50K). Considera adiar a compra que mencionaste."
- **Orçamento adaptativo:** em vez de "orçamento fixo de 50K para alimentação", o sistema sugere: "Este mês podes gastar entre 40-60K em alimentação dependendo do cenário de rendimento. Vou-te avisando à medida que as entradas confirmarem o cenário."

---

## 7. Motor de IA — GenAI e Sistema Agêntico

### ADR-006: GenAI como Motor, Não como Feature

**Decisão:** A GenAI e o sistema agêntico são a camada de inteligência que potencializa todas as funcionalidades da plataforma. Não é "um chatbot" nem "uma feature de IA". É o motor que torna cada módulo mais inteligente.

### ADR-010: Independência Funcional da IA — Plataforma 100% Operacional sem GenAI

**Decisão:** Toda a funcionalidade da plataforma deve ser acessível e operacional sem qualquer dependência de GenAI ou modelos multimodais. A IA é uma camada de aceleração e inteligência, não uma dependência funcional. Se os modelos ficarem indisponíveis, lentos, ou se o utilizador preferir usar formulários tradicionais, a plataforma funciona a 100%. Nenhuma funcionalidade fica bloqueada pela ausência de IA.

**Princípio arquitectural:** para cada funcionalidade que a IA automatiza ou melhora, deve existir um caminho manual/formulário equivalente. A IA é atalho, não obrigação.

**Regras para implementação:**

1. **Todo o input via IA tem equivalente em formulário.** Se o utilizador pode dizer "gastei 5.000 no candongueiro" por voz, também pode preencher: valor → 5.000, categoria → Transporte, subcategoria → Candongueiro, conta → Cash. O formulário manual é sempre acessível.

2. **O OCR é atalho, não obrigação.** Se o utilizador pode fotografar um recibo para extracção automática, também pode preencher os campos à mão. O resultado do OCR é sempre apresentado como pré-preenchimento editável — nunca como entrada final sem confirmação.

3. **A categorização automática é sugestão.** A IA categoriza transacções automaticamente, mas o utilizador pode sempre alterar, e o dropdown/selector de categorias manual está sempre disponível.

4. **A kixikila funciona sem IA.** Criar grupo, adicionar membros, definir rotação, registar contribuições, confirmar pagamentos, gerir payouts — tudo via formulários. A IA adiciona: sugestão de ordem óptima, detecção de risco, relatórios automáticos. Mas estas são melhorias opcionais.

5. **O forecasting é complemento, não substituto de orçamento manual.** O utilizador pode definir orçamentos e metas manualmente, sem depender de projecções inteligentes. As projecções da IA são apresentadas como informação adicional.

6. **Os insights e educação financeira são notificações opcionais.** O utilizador pode desactivá-los. A app funciona sem nudges nem sugestões de IA.

7. **O WhatsApp funciona sem NLU avançado.** Se o modelo de linguagem natural falhar, o bot WhatsApp apresenta menus estruturados (botões, listas) para o utilizador seleccionar opções em vez de escrever texto livre.

**Implicação técnica:** o AI Engine é um serviço desacoplado. Os módulos core (transacções, kixikila, família, orçamentos) nunca fazem chamadas directas a APIs de LLM. Em vez disso, chamam o AI Engine como serviço opcional que retorna sugestões. Se o AI Engine não responder em N segundos ou retornar erro, a funcionalidade continua sem IA — o formulário/fluxo manual é o fallback automático.

```
Fluxo com IA:
  Input → AI Engine (categoriza, extrai, sugere) → Pré-preenchimento → Utilizador confirma/edita → Guarda

Fluxo sem IA (fallback ou preferência do utilizador):
  Input → Formulário manual → Utilizador preenche → Guarda

Ambos os fluxos produzem exactamente o mesmo resultado na base de dados.
```

**Arquitectura do AI Engine:**

```
┌──────────────────────────────────────────────────┐
│                   AI ENGINE                       │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  LLM Router  │  │  Context Manager         │  │
│  │  (modelo +   │  │  (perfil do utilizador,  │  │
│  │   fallback)  │  │   histórico, preferências)│  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                     │                   │
│  ┌──────▼─────────────────────▼───────────────┐  │
│  │           Agent Orchestrator                │  │
│  │  (decide qual agente/tool activar)          │  │
│  └──────┬──────┬──────┬──────┬──────┬─────────┘  │
│         │      │      │      │      │             │
│  ┌──────▼┐ ┌───▼──┐ ┌─▼────┐┌▼─────┐┌▼────────┐ │
│  │Categ. │ │Forec.│ │Kixik.││Family││Educação │ │
│  │Agent  │ │Agent │ │Agent ││Agent ││Agent    │ │
│  └───────┘ └──────┘ └──────┘└──────┘└─────────┘ │
│                                                   │
│  Tools disponíveis para todos os agentes:         │
│  - OCR (recibos, extractos, comprovativos)        │
│  - Speech-to-Text (áudio WhatsApp em PT-AO)       │
│  - Cálculo financeiro (juros, amortizações, etc.) │
│  - Geração de relatórios                          │
│  - Notificação (push, WhatsApp, email)            │
│  - Consulta de câmbio (BNA + informal)            │
│  - Pagamento (via integrações)                    │
└──────────────────────────────────────────────────┘
```

### 7.1 Agentes Especializados

**Categorization Agent**
- Categoriza transacções automaticamente com base em: texto da descrição, merchant, valor, hora, padrão histórico
- Categorias angolanas nativas: gasola, candongueiro, zungueira, empregada doméstica, propina escolar, recargas, kinguilas, bidão de água, gás, gerador
- Aprende com correcções do utilizador: se o utilizador recategoriza, o agente actualiza o modelo para aquele utilizador
- Detecta transacções recorrentes automaticamente (renda, propinas, recargas)

**Forecasting Agent**
- Analisa padrões de rendimento e despesa
- Gera projecções em intervalo (optimista/realista/pessimista)
- Alerta proactivamente sobre riscos de cash flow
- Sugere ajustes de orçamento com base no cenário actual

**Kixikila Agent**
- Monitoriza estado de contribuições e alerta sobre riscos
- Calcula reliability scores dos membros
- Sugere ordem de rotação óptima
- Gera relatórios de ciclo automáticos (partilháveis via WhatsApp)
- Detecta padrões de atraso e alerta admins antes de se tornarem problemas

**Family Agent**
- Analisa o grafo financeiro familiar
- Detecta tendências no suporte familiar ("gastos com dependentes aumentaram 20%")
- Sugere optimizações ("a propina do sobrinho pode ser paga por referência MCX e poupar 2.000 Kz em taxas")
- Gera relatório familiar mensal

**Education Agent**
- Gera educação financeira contextual baseada nos dados REAIS do utilizador
- Não são "artigos genéricos" — são insights personalizados
- Exemplos:
  - "Gastaste 18% do rendimento em recargas este mês. Se mudasses para o plano X da Unitel, poupavas 4.200 Kz/mês — em 6 meses tens o suficiente para a tua meta da TV."
  - "A tua kixikila paga-te 500K daqui a 3 meses. Se colocares esse valor num depósito a prazo no BAI a 7%, ganhas 8.750 Kz em 6 meses."
  - "Estás a gastar 35% do rendimento em alimentação. A média dos utilizadores com rendimento semelhante é 25%. Queres que te sugira formas de optimizar?"

### 7.2 OCR Multimodal

**O que o OCR processa:**
- Recibos de compras (zungueiras, lojas, mercados)
- Talões de depósito Multicaixa
- Extractos bancários impressos ou em PDF
- Comprovativos de transferência (screenshot)
- Facturas (água, luz, telefone)
- Comprovativos de pagamento de kixikila

**Pipeline:**
```
Imagem/PDF → Pré-processamento (rotação, contraste) 
  → Modelo multimodal (GPT-4o / Claude) com prompt específico para documentos angolanos
  → Extracção estruturada: {amount, date, merchant, category, reference}
  → Validação (valor dentro de range esperado, data coerente)
  → Criação de transacção (draft para confirmação do utilizador ou automática)
```

**Considerações para documentos angolanos:**
- Recibos de zungueira costumam ser manuscritos ou inexistentes — a IA precisa de aceitar input por texto/voz como alternativa
- Talões Multicaixa têm formato específico — criar template de extracção
- Extractos de bancos angolanos (BFA, BAI, BPC, BIC) têm formatos diferentes — criar parser por banco

### 7.3 Interacção por Voz (WhatsApp)

**Pipeline de voz:**
```
Áudio WhatsApp (opus/ogg) 
  → Speech-to-Text (Whisper, optimizado para PT-AO)
  → NLU: extracção de intent + entidades
  → Routing para agente apropriado
  → Resposta em texto (via WhatsApp)
```

**Exemplos de interacções por voz:**
- "Gastei três mil no candongueiro" → Categorization Agent → transacção de 3.000 Kz, categoria: transporte/candongueiro
- "Quanto gastei esta semana?" → Query → resposta com breakdown
- "A Maria já pagou a kixikila?" → Kixikila Agent → verifica estado da contribuição da Maria
- "Posso comprar aquela TV de 150 mil?" → Forecasting Agent → simula impacto no cash flow e responde com cenário

---

## 8. Integração de Pagamentos

### ADR-007: Arquitectura de Integração com Provedores de Pagamento

**Decisão:** Implementar adapter pattern para integrações de pagamento, com interface unificada e provedores intercambiáveis.

```
┌──────────────────────────┐
│   Payment Service        │
│   (interface unificada)  │
├──────────────────────────┤
│ - initiate_payment()     │
│ - check_status()         │
│ - process_callback()     │
│ - initiate_payout()      │
│ - get_balance()          │
└─────────┬────────────────┘
          │
    ┌─────┼──────┬──────────┬──────────┐
    │     │      │          │          │
┌───▼──┐┌─▼───┐┌─▼────┐┌───▼───┐┌────▼────┐
│é-Kwa.││ MCX ││Unitel││PayPay ││Manual  │
│Adapt.││Adap.││Money ││Adapt. ││(OCR)   │
│      ││     ││Adapt.││       ││Adapt.  │
└──────┘└─────┘└──────┘└───────┘└────────┘
```

**Interface do Payment Adapter:**

```python
class PaymentAdapter(ABC):
    @abstractmethod
    async def initiate_payment(
        self, 
        amount: Decimal, 
        currency: str, 
        payer_ref: str,  # referência do pagador no provider
        description: str,
        metadata: dict  # kixikila_id, cycle_id, etc.
    ) -> PaymentInitResult:
        """Inicia um pagamento. Retorna referência e URL/deeplink."""
        pass
    
    @abstractmethod
    async def check_payment_status(
        self, 
        payment_ref: str
    ) -> PaymentStatus:
        """Verifica estado de um pagamento."""
        pass
    
    @abstractmethod
    async def process_webhook(
        self, 
        payload: dict
    ) -> PaymentWebhookResult:
        """Processa callback/webhook do provider."""
        pass
    
    @abstractmethod
    async def initiate_payout(
        self, 
        amount: Decimal, 
        currency: str, 
        recipient_ref: str,
        description: str
    ) -> PayoutResult:
        """Envia dinheiro para um destinatário."""
        pass
```

**Prioridade de implementação:**
1. **é-Kwanza** — já existe registo. API disponível. MVP.
2. **Manual + OCR** — fallback universal. Utilizador envia comprovativo, OCR valida.
3. **MCX (Multicaixa Express)** — via EMIS, pagamento por referência.
4. **Unitel Money** — segundo maior provider.
5. **PayPay** — agregador.

---

## 9. Suporte a Transacções Cash (Cash-Inclusive)

### ADR-008: Cash como Modo Complementar

**Decisão:** O registo de transacções em cash é uma funcionalidade complementar ao fluxo digital existente. A app assume que o utilizador é bancarizado e usa MCX/apps bancárias, mas também opera com dinheiro físico em situações específicas (táxi/candongueiro, praça, zungueira, compras na rua). O MCX transformou significativamente os pagamentos em Angola, mas o cash continua presente no quotidiano. As funcionalidades existentes de gestão digital mantêm-se — isto é uma adição.

**Funcionalidades:**
- **Registo rápido de cash:** interface optimizada para registar gastos em dinheiro físico em <5 segundos (botão flutuante → valor → categoria → feito)
- **Voz como input primário:** "Gastei cinco mil no pão" via WhatsApp ou na app
- **Categorias inteligentes por hora/local:** às 7h da manhã, sugerir "transporte". À hora de almoço, sugerir "alimentação". Se activar localização, sugerir categorias baseadas no tipo de zona
- **Sem obrigação de saldo:** o utilizador pode registar gastos sem manter saldo de carteira cash actualizado. O sistema calcula saldo implícito se o utilizador quiser
- **Reconciliação de cash:** no final do dia/semana, pergunta "Tens X Kz na carteira? Se não, registamos a diferença como 'gastos não registados'?"

---

## 10. Educação Financeira Contextual

### ADR-009: Educação Baseada em Dados Reais, Não Genérica

**Decisão:** A educação financeira no O Financeiro é gerada pela IA com base nos dados reais do utilizador. Nunca é genérica.

**Formato:**
- **Nudges contextuais:** mensagens curtas no momento certo ("Acabaste de gastar em Uber Eats pela 4ª vez esta semana. Este mês já foram 28K — o dobro do mês passado.")
- **Relatório mensal inteligente:** sumário gerado pela IA no final do mês, com linguagem simples, comparações com meses anteriores, e 1-3 sugestões accionáveis
- **Desafios personalizados:** a IA propõe desafios baseados nos dados ("Desafio: reduzir gastos com recargas em 20% este mês. Se conseguires, pouparás 6.200 Kz.")
- **Micro-lições:** quando o utilizador executa uma acção financeira (ex: cria uma meta de poupança), a IA explica brevemente o conceito ("Sabias que poupar 10% do rendimento todos os meses, mesmo que pouco, resulta em X ao final de um ano?")

---

## 11. Resumo de Módulos e Prioridade de Implementação

| Módulo | Prioridade | Dependências | Impacto na Aquisição |
|--------|-----------|-------------|---------------------|
| Kixikila Digital | P0 — MVP | Integração é-Kwanza, Schema BD | Muito Alto (efeito de rede) |
| WhatsApp Channel | P0 — MVP | WhatsApp Business API, STT | Alto (canal de distribuição) |
| OCR Multimodal | P1 | Modelo multimodal (API) | Médio (remove entrada manual) |
| Cash-Inclusive UX | P1 | Nenhuma | Médio (complemento ao fluxo digital) |
| Grafo Familiar | P1 | Schema BD | Médio (diferenciação — adição às contas partilhadas existentes) |
| Forecasting Variável | P2 | Dados históricos mínimos | Médio (retenção) |
| Educação Contextual | P2 | AI Engine, dados históricos | Médio (retenção/engagement) |
| Integração MCX/Unitel | P2 | Contratos com providers | Alto (mais opções pagamento) |
| Dual-Currency | P3 | Schema BD | Baixo (uso marginal no quotidiano — feature opcional futura) |

**Definição de prioridades:**
- **P0:** Necessário para o MVP diferenciado. Sem isto, O Financeiro é mais uma app de tracking.
- **P1:** Implementar nos primeiros 1-3 meses pós-MVP. Aumenta retenção e diferenciação.
- **P2:** Implementar nos meses 3-6. Funcionalidades de profundidade que aumentam engagement.
- **P3:** Backlog. Implementar quando houver procura real dos utilizadores.

---

## 12. Notas Técnicas para Implementação

### Stack Confirmada
- **Backend:** FastAPI (Python)
- **Base de dados:** PostgreSQL + Redis (cache/sessões)
- **Frontend Web:** Já implementado (quase 100%)
- **Frontend Mobile:** React Native
- **WhatsApp:** WhatsApp Business API (Cloud API)
- **IA:** OpenAI API (GPT-4o para multimodal/OCR, Whisper para STT) + fallback Anthropic Claude
- **Pagamentos:** Adapter pattern com é-Kwanza como provider principal

### Considerações de Deployment
- **Região:** o backend deve estar o mais próximo possível de Angola. Azure South Africa ou AWS Cape Town como opções.
- **Latência WhatsApp:** as respostas do bot devem ser <5 segundos. Usar async processing com resposta de "estou a processar" se necessário.
- **Offline-first (mobile):** a app mobile deve funcionar offline para registo de transacções, sincronizando quando houver conectividade.
- **Dados sensíveis:** dados financeiros e de kixikila são sensíveis. Encriptar em repouso. HTTPS obrigatório. Tokens de pagamento nunca armazenados em plaintext.

---

*Fim do documento. Este documento deve ser utilizado pelo Claude Code como referência para criar ADRs detalhados e planos de implementação sprint-by-sprint.*
