# O Financeiro — Roteiros de Vídeos Demonstrativos

**Objectivo:** Mostrar aos utilizadores o poder real da plataforma para aumentar activação e retenção.

**Método de gravação:** Playwright browser automation com screenshots/screen recording. Dados de demonstração realistas no seed.

**Idioma:** Português (Angola). Sem narração áudio na primeira versão — legendas/cards overlay no vídeo.

---

## Índice de Vídeos

| # | Vídeo | Duração est. | Público-alvo |
|---|---|---|---|
| V01 | Registo + Primeiro login | ~2 min | Novos utilizadores |
| V02 | Tour pessoal — visão geral | ~3 min | Novos utilizadores |
| V03 | Tour família — visão geral | ~3 min | Utilizadores com família |
| V04 | Gestão de contas | ~2 min | Todos |
| V05 | Transacções — registo manual | ~2 min | Todos |
| V06 | Orçamentos | ~2 min | Todos |
| V07 | Metas de poupança | ~2 min | Todos |
| V08 | Dívidas | ~2 min | Quem tem dívidas |
| V09 | Investimentos | ~2 min | Quem investe |
| V10 | Património (bens físicos) | ~1.5 min | Todos |
| V11 | Assistente IA — demonstração completa | ~5 min | Todos (o mais importante) |
| V12 | Família — criação e gestão partilhada | ~3 min | Quem quer usar em família |
| V13 | Relatórios e Score Financeiro | ~2 min | Todos |

---

## Dados necessários no seed

### Cussei Bento (+244923456789)

**Contas pessoais:**
- BAI Conta Ordem: ~970.000 Kz (salário)
- BFA Poupança: ~840.000 Kz
- Carteira: ~220.000 Kz (cash)

**Transacções pessoais (últimos 30 dias, mínimo 40):**
- Salário: +450.000 Kz (dia 1)
- Freelance: +250.000 Kz (dia 5)
- Rendas: +190.000 Kz (dia 10)
- Gasolina: 5x entre 10.000-25.000 Kz
- Alimentação: 8x entre 2.000-8.000 Kz
- Restaurante: 3x entre 3.000-12.000 Kz
- Educação filhos: 2x propinas ~19.000 Kz
- Internet: 1x 3.500 Kz
- Gás: 2x 12.000-15.000 Kz
- Uber/Taxi: 3x 1.500-5.000 Kz
- Manutenção: 1x 20.000 Kz
- Sem categoria: 2x (para mostrar categorização)

**Orçamento pessoal activo:**
- "Orçamento Abril 2026" com 6 categorias e limites realistas
- Pelo menos 2 categorias >70% para mostrar alertas

**Metas pessoais:**
- "Carro novo": target 10M, actual 2.4M (24%)
- "Fundo de emergência": target 3M, actual 1.8M (60%)

**Dívidas pessoais:**
- "Empréstimo automóvel": 4.55M, juros 18%, prestação 150K/mês
- "Empréstimo do João": 500K, informal, sem juros

**Investimentos pessoais:**
- "Depósito a prazo BAI": 1M, 12% anual
- "Obrigações do Tesouro": 500K, 8% anual
- "Poupança BFA": 600K, 5% anual

**Bens (património físico):**
- "Toyota Hilux 2019": valor actual 35M
- "Equipamento informático": valor actual 800K
- "Mobiliário escritório": valor actual 450K

### Ana Cussei (+244912345678)

**Contas pessoais:**
- BAI Conta Salário: ~307.000 Kz
- Carteira: ~15.000 Kz

**Transacções pessoais (últimos 30 dias, mínimo 15):**
- Salário: +250.000 Kz (dia 5)
- Zungueira semanal: 4x 4.500 Kz
- Mercado: 3x entre 5.000-15.000 Kz
- EPAL (água): 1x 3.200 Kz
- ENDE (luz): 1x 8.500 Kz
- Candongueiro: 5x 500-1.500 Kz
- Propina escola filhos: 1x 25.000 Kz
- Cabeleireiro: 1x 8.000 Kz

**Metas pessoais:**
- "Poupança para emergência": target 500K, actual 80K (16%)

**Sem dívidas pessoais** (demonstra perfil limpo)

### Família Cussei (partilhado)

**Conta família:**
- Conta Família BAI: ~252.000 Kz

**Transacções familiares (últimos 30 dias, mínimo 20):**
- Mesada família: +150.000 Kz (Cussei transfere)
- Freelance (Cussei): +150.000 Kz
- Propinas filhos: 3x 15.000-25.000 Kz
- Gasolina familiar: 2x 10.000-15.000 Kz
- Manutenção casa: 1x 20.000 Kz
- Empregada doméstica: 1x 35.000 Kz
- Supermercado: 4x 8.000-20.000 Kz
- Gás: 1x 12.000 Kz
- DSTV: 1x 15.000 Kz
- Água (EPAL): 1x 4.500 Kz
- Luz (ENDE): 1x 12.000 Kz

**Orçamento familiar activo:**
- "Orçamento Familiar Abril" com categorias: Alimentação 80K, Educação 70K, Utilidades 40K, Transporte 30K, Casa 50K

**Metas familiares:**
- "Férias família": target 1.5M, actual 450K (30%)
- "Fundo escolar": target 2M, actual 600K (30%)

**Dívidas familiares:**
- "Electrodomésticos casa": 800K, informal, prestação 100K/mês

**Investimentos familiares:**
- "Poupança familiar BAI": 315K, 7% anual

**Bens familiares:**
- "Mobiliário casa": valor actual 2.8M
- "Electrodomésticos": valor actual 1.2M

---

## V01 — Registo + Primeiro Login

**Duração:** ~2 min
**Cenário:** Novo utilizador descobre O Financeiro e regista-se.

### Roteiro passo a passo

```
CENA 1: Landing page (5s)
  - Abrir https://ofinanceiro.app
  - Scroll suave pela landing: hero → features → pricing
  - Highlight: "A melhor app de gestão financeira para Angola"

CENA 2: Registo (30s)
  - Click "Criar conta" / "Começar grátis"
  - Preencher: nome "João Teste", telefone "+244945000001"
  - Receber OTP (mostrar o campo OTP)
  - Digitar código
  - Conta criada → redirect para onboarding

CENA 3: Onboarding (45s)
  - Passo 1: Escolher moeda principal (Kz)
  - Passo 2: Criar primeira conta ("BAI Conta Salário", saldo inicial 150.000 Kz)
  - Passo 3: Definir dia do salário (dia 25)
  - Onboarding completo → redirect para dashboard

CENA 4: Primeiro dashboard (30s)
  - Dashboard pessoal com a conta criada
  - Património Líquido: 150.000 Kz
  - Mostrar sidebar com todas as secções disponíveis
  - Card: "Parabéns! A tua conta está pronta. Experimenta registar o teu primeiro gasto."
```

### Playwright actions
```
navigate → /
scroll landing
click "Criar conta"
fill phone, name
fill OTP
complete onboarding steps
verify dashboard shows 150.000 Kz
screenshot each step
```

---

## V02 — Tour Pessoal (visão geral)

**Duração:** ~3 min
**Cenário:** Cussei já tem dados. Tour rápido por todas as páginas pessoais.
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Dashboard pessoal (20s)
  - Login como Cussei
  - Dashboard mostra: Património 46M+, Contas 2M+, Receitas vs Despesas
  - Highlight: "Visão completa das tuas finanças num só ecrã"

CENA 2: Transacções (15s)
  - Click sidebar "Transacções"
  - Lista agrupada por data, com categorias e ícones
  - Filtros: Despesas, Receitas, 7 dias, Mês
  - Highlight: "Todas as tuas transacções organizadas"

CENA 3: Contas (10s)
  - Click "Contas"
  - 3 contas pessoais com saldos
  - Highlight: "Gere todas as tuas contas num só lugar"

CENA 4: Orçamentos (15s)
  - Click "Orçamentos"
  - Orçamento activo com barras de progresso por categoria
  - Educação a 95% (alerta amarelo)
  - Highlight: "Controla quanto gastas em cada categoria"

CENA 5: Metas (15s)
  - Click "Metas"
  - "Carro novo" 24%, "Fundo emergência" 60%
  - Highlight: "Define objectivos e acompanha o progresso"

CENA 6: Dívidas (10s)
  - Click "Dívidas"
  - 2 dívidas com progresso de pagamento
  - Highlight: "Gere as tuas dívidas e simula pagamento acelerado"

CENA 7: Investimentos (10s)
  - Click "Investimentos"
  - Portfolio com 3 investimentos e retorno
  - Highlight: "Acompanha os teus investimentos e rendimentos"

CENA 8: Património (10s)
  - Click "Património"
  - Bens físicos com valor actual
  - Highlight: "Regista bens para ter uma visão completa do teu património"

CENA 9: Assistente (20s)
  - Click "Assistente"
  - Quick action: "Quanto tenho de saldo?"
  - Agente responde com saldo real e gráfico
  - Highlight: "O teu consultor financeiro pessoal, disponível 24/7"

CENA 10: Relatórios (10s)
  - Click "Relatórios"
  - Gráficos de gastos por categoria, evolução mensal
  - Highlight: "Relatórios detalhados para entenderes as tuas finanças"
```

---

## V03 — Tour Família (visão geral)

**Duração:** ~3 min
**Cenário:** Ana (ADULT) navega pelo contexto família.
**User:** Ana Cussei

### Roteiro passo a passo

```
CENA 1: Switch para contexto família (10s)
  - Login como Ana
  - Click "Pessoal" no sidebar → dropdown → "Família Cussei"
  - Dashboard muda para familiar
  - Highlight: "Muda entre pessoal e família com um click"

CENA 2: Dashboard família (20s)
  - Património Familiar ~3M Kz
  - Contas partilhadas, Fluxo de Caixa, Gastos por Membro
  - Highlight: "Visão completa das finanças da família"

CENA 3: Contas partilhadas (10s)
  - Conta Família BAI com saldo
  - Highlight: "Uma conta partilhada que todos os membros podem usar"

CENA 4: Transacções familiares (15s)
  - Transacções de AMBOS os membros na conta família
  - Destaque: transacções do Cussei E da Ana aparecem juntas
  - Highlight: "Todas as transacções da família, de todos os membros"

CENA 5: Orçamento doméstico (15s)
  - Orçamento familiar com categorias do lar
  - Gastos agregados de todos os membros
  - Highlight: "O orçamento conta os gastos de toda a família"

CENA 6: Metas familiares (10s)
  - "Férias família" 30%, "Fundo escolar" 30%
  - Highlight: "Poupem juntos para objectivos comuns"

CENA 7: Dívidas familiares (10s)
  - "Electrodomésticos casa" com progresso
  - Highlight: "Acompanhem as dívidas da casa em conjunto"

CENA 8: Gastos por membro (10s)
  - Painel mostrando quanto cada membro gastou
  - Highlight: "Transparência total — sabem quem gastou o quê"

CENA 9: Assistente familiar (20s)
  - Chat: "gastei 25000 com combustível"
  - Agente regista na Conta Família automaticamente
  - Highlight: "O assistente funciona em família — regista na conta partilhada"

CENA 10: Membros (10s)
  - Lista de membros: Cussei (Admin), Ana (Adult)
  - Highlight: "Convide familiares com um código de convite"
```

---

## V04 — Gestão de Contas

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Lista de contas (10s)
  - Navegar a /accounts
  - 3 contas com saldos e instituições
  - Highlight: "As tuas contas organizadas por tipo"

CENA 2: Criar nova conta (30s)
  - Click "Nova conta"
  - Preencher: nome "Multicaixa Express", tipo "Mobile Money"
  - Saldo inicial: 5.000 Kz
  - Guardar → conta aparece na lista
  - Highlight: "Adiciona qualquer tipo de conta — banco, cash, mobile money"

CENA 3: Ver detalhe de conta (15s)
  - Click numa conta existente
  - Modal com dados, opção de editar
  - Highlight: "Consulta e edita os dados de cada conta"

CENA 4: Transferência entre contas (30s)
  - Click "Transferir" (ou via FAB)
  - De: BAI Conta Ordem → Para: Carteira
  - Valor: 10.000 Kz
  - Confirmar → saldos actualizados em ambas
  - Highlight: "Transfere entre as tuas contas com um click"

CENA 5: Resultado (10s)
  - Voltar à lista — saldos reflectem a transferência
  - Highlight: "Saldos sempre actualizados em tempo real"
```

---

## V05 — Transacções (registo manual)

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Lista de transacções (10s)
  - Navegar a /transactions
  - Vista agrupada por data
  - Filtros visíveis: tipo, período
  - Highlight: "Histórico completo das tuas transacções"

CENA 2: Registar despesa (30s)
  - Click "+ Nova transacção"
  - Tipo: Despesa
  - Valor: 8.500 Kz
  - Descrição: "Almoço no Chill Out"
  - Categoria: auto-seleccionada "Restaurante"
  - Conta: BAI Conta Ordem
  - Guardar → toast "Transacção registada"
  - Highlight: "Regista gastos em segundos — a categoria é sugerida automaticamente"

CENA 3: Registar receita (20s)
  - Click "+ Nova transacção"
  - Tipo: Receita
  - Valor: 50.000 Kz
  - Descrição: "Pagamento freelance"
  - Conta: BAI Conta Ordem
  - Guardar
  - Highlight: "Regista receitas para ter o fluxo completo"

CENA 4: Filtrar e pesquisar (15s)
  - Filtrar por "Despesas" apenas
  - Mudar para "Este mês"
  - Mostrar totais actualizados
  - Highlight: "Filtra para encontrar exactamente o que procuras"

CENA 5: Editar transacção (15s)
  - Click numa transacção existente
  - Editar categoria ou valor
  - Guardar → actualizado imediatamente
  - Highlight: "Corrige qualquer transacção a qualquer momento"

CENA 6: Vista planilha (10s)
  - Click "Planilha"
  - Mostrar vista tabular (se existir)
  - Highlight: "Vista de planilha para quem prefere tabelas"
```

---

## V06 — Orçamentos

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Dashboard de orçamento (15s)
  - Navegar a /budget
  - Orçamento activo com barras por categoria
  - Educação a 95% (quase no limite!)
  - Highlight: "Vê instantaneamente como estás em cada categoria"

CENA 2: Detalhe do orçamento (15s)
  - Click no orçamento
  - Lista de categorias com spent vs limit
  - Alertas coloridos (verde, amarelo, vermelho)
  - Highlight: "Alertas visuais quando te aproximas do limite"

CENA 3: Criar novo orçamento (40s)
  - Click "Novo orçamento"
  - Nome: "Orçamento Maio 2026"
  - Método: Envelope
  - Adicionar categorias: Alimentação 80K, Transporte 50K, Lazer 30K
  - Guardar
  - Highlight: "Cria orçamentos por categorias com limites personalizados"

CENA 4: Acompanhamento (15s)
  - Mostrar como os gastos automaticamente contam contra o orçamento
  - Barra de progresso avança em tempo real
  - Highlight: "Cada gasto que registares é contabilizado automaticamente"
```

---

## V07 — Metas de Poupança

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Lista de metas (10s)
  - Navegar a /goals
  - 2 metas activas com progresso visual
  - Highlight: "Acompanha as tuas metas de poupança"

CENA 2: Detalhe da meta (15s)
  - Click "Carro novo" (24%)
  - Barra de progresso, valor actual vs target
  - Histórico de contribuições
  - Highlight: "Vê cada contribuição que fizeste"

CENA 3: Contribuir (30s)
  - Click "Contribuir"
  - Seleccionar conta: BAI Conta Ordem
  - Valor: 100.000 Kz
  - Confirmar → progresso actualiza de 24% para 25%
  - Highlight: "Contribui directamente da tua conta"

CENA 4: Criar nova meta (30s)
  - Click "Nova meta"
  - Nome: "Viagem a Cabo Ledo"
  - Valor alvo: 200.000 Kz
  - Data alvo: Dezembro 2026
  - Guardar → aparece na lista
  - Highlight: "Define qualquer objectivo — o app ajuda-te a chegar lá"

CENA 5: Meta completa (10s)
  - Mostrar uma meta concluída (se existir) com badge "Concluída"
  - Highlight: "Celebra cada meta alcançada"
```

---

## V08 — Dívidas

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Lista de dívidas (10s)
  - Navegar a /debts
  - 2 dívidas com saldo devedor e progresso
  - Total em dívida e pagamento mínimo mensal
  - Highlight: "Visualiza todas as tuas dívidas num só lugar"

CENA 2: Detalhe da dívida (15s)
  - Click "Empréstimo automóvel"
  - Saldo devedor, taxa de juros, prestação mensal
  - Progresso de pagamento
  - Highlight: "Todos os detalhes da dívida organizados"

CENA 3: Registar pagamento (30s)
  - Click "Pagar" na dívida
  - Seleccionar conta: BAI Conta Ordem
  - Valor: 150.000 Kz (prestação mensal)
  - Confirmar → saldo devedor actualiza
  - Highlight: "Regista pagamentos e vê o progresso em tempo real"

CENA 4: Simulação de pagamento acelerado (30s)
  - Click "Simular" na página de dívidas
  - Dívida: Empréstimo automóvel
  - Pagamento extra: +50.000 Kz/mês
  - Resultado: "Pouparás X meses e Y Kz em juros"
  - Highlight: "Simula quanto poupas se pagares mais — antes de decidir"
```

---

## V09 — Investimentos

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Portfolio (15s)
  - Navegar a /investments
  - 3 investimentos com valor investido vs valor actual
  - Performance total do portfolio
  - Highlight: "Acompanha o rendimento dos teus investimentos"

CENA 2: Detalhe do investimento (10s)
  - Click "Depósito a prazo BAI"
  - Valor investido, taxa, data início/maturidade
  - Highlight: "Todos os detalhes de cada investimento"

CENA 3: Registar novo investimento (30s)
  - Click "Novo investimento"
  - Nome: "Certificado BFA"
  - Tipo: Depósito
  - Valor: 200.000 Kz
  - Taxa: 10% anual
  - Guardar
  - Highlight: "Regista qualquer investimento — depósitos, obrigações, acções"

CENA 4: Simulação de rendimento (20s)
  - Simulador: quanto vale 200K a 10% em 5 anos?
  - Gráfico de crescimento
  - Highlight: "Simula o crescimento antes de investir"

CENA 5: Insights (10s)
  - Ver insights automáticos (se disponíveis)
  - Highlight: "Recebe alertas sobre oportunidades e vencimentos"
```

---

## V10 — Património (Bens Físicos)

**Duração:** ~1.5 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Lista de bens (10s)
  - Navegar a /assets
  - Toyota Hilux, Equipamento informático, Mobiliário
  - Valor total do património físico
  - Highlight: "Regista os teus bens para uma visão completa"

CENA 2: Registar novo bem (30s)
  - Click "Novo bem"
  - Nome: "iPhone 16 Pro"
  - Tipo: Electrónica
  - Valor de compra: 350.000 Kz
  - Valor actual: 300.000 Kz
  - Guardar
  - Highlight: "Regista qualquer bem — veículos, electrónica, imóveis"

CENA 3: Dashboard reflecte (10s)
  - Voltar ao dashboard
  - Património Líquido actualizado com o novo bem
  - Highlight: "O dashboard soma tudo: contas + investimentos + bens - dívidas"
```

---

## V11 — Assistente IA (demonstração completa)

**Duração:** ~5 min (o vídeo mais importante)
**User:** Cussei Bento (pessoal) + Ana (família)

### Roteiro passo a passo

```
CENA 1: Introdução (10s)
  - Abrir /assistant
  - Mostrar a tela inicial com quick actions
  - Highlight: "O teu consultor financeiro pessoal — fala com ele como falarias com um amigo"

CENA 2: Consultar saldo (20s)
  - Click "Quanto tenho de saldo?"
  - Agente responde com tabela de contas e saldo total
  - Highlight: "Pergunta natural → resposta completa com dados reais"

CENA 3: Registar gasto por voz natural (30s)
  - Escrever: "gastei 15000 no supermercado Kero"
  - Agente infere: Despesa, 15.000 Kz, Categoria: Alimentação, Conta: BAI
  - Pede confirmação
  - Confirmar: "sim"
  - Agente: "Registado com sucesso"
  - Highlight: "Diz o que gastaste em linguagem natural — o assistente faz o resto"

CENA 4: Registar receita (20s)
  - Escrever: "recebi 30000 de um cliente pelo website"
  - Agente infere: Receita, 30.000 Kz, Categoria: Freelance
  - Confirmar
  - Highlight: "Receitas também — só dizer"

  ⚠️ A partir daqui, TUDO na mesma conversa — sem "Nova conversa" (ver L1)

CENA 5: Análise de gastos (30s)
  - Escrever: "quanto gastei em alimentação este mês?"
  - Agente busca transacções, calcula total, apresenta breakdown
  - Highlight: "Analisa os teus gastos em qualquer categoria ou período"

CENA 6: Consultar orçamento (20s)
  - Escrever: "como está o meu orçamento?"
  - Agente mostra status por categoria com alertas
  - Highlight: "Monitora o orçamento sem abrir nenhuma página"

CENA 7: Verificar meta (20s)
  - Escrever: "como estão as minhas metas de poupança?"
  - Agente mostra progresso, valor restante, estimativa
  - Highlight: "Acompanha metas directamente no chat"

CENA 8: Consulta "posso comprar?" (30s) — try/catch no script
  - Escrever: "posso comprar um televisor de 200000 Kz?"
  - Agente calcula: saldo actual, despesas mensais, impacto
  - Responde com recomendação fundamentada
  - Highlight: "Antes de comprar, pergunta ao assistente — ele analisa o impacto real"

CENA 9: Score financeiro (20s) — try/catch no script
  - Escrever: "qual é o meu score financeiro?"
  - Agente calcula score 0-100 com factores detalhados
  - Highlight: "Recebe um score personalizado com recomendações concretas"

CENA 10: Relatório do mês (30s) — try/catch no script
  - Escrever: "gera o relatório deste mês"
  - Agente gera: receitas, despesas, taxa poupança, top categorias
  - Highlight: "Relatório mensal completo em linguagem natural"

  ⚠️ FIM das interacções pessoais. Agora validar nas páginas (ver L8).

CENA 10b: Validação cruzada (60s)
  - page.goto("/transactions") — ver despesa e receita registadas
  - page.goto("/budget") — ver estado do orçamento
  - page.goto("/goals") — ver progresso das metas
  - page.goto("/debts") — ver dívidas
  - page.goto("/accounts") — ver saldos actualizados
  - page.goto("/dashboard") — visão geral final
  - Highlight: "Tudo o que fizeste no chat reflecte-se nas páginas em tempo real"

  ⚠️ Switch para família. Nova conversa aqui SIM (mudança de contexto).

CENA 11: Assistente familiar (45s) — conversa contínua
  - Switch para contexto família (page.goto /family/assistant)
  - Escrever: "gastei 18000 em gasolina para a família" → confirmar
  - Escrever: "recebemos 120000 de rendimento de freelance na conta da família" → confirmar (⚠️ ver L3 — phrasing explícito)
  - Escrever: "quanto temos de saldo familiar?"
  - Highlight: "O assistente funciona em família — despesas E receitas partilhadas"

CENA 12: Validação família (30s)
  - page.goto("/family/transactions") — ver gastos e receitas familiares
  - page.goto("/family/dashboard") — encerramento
  - Highlight: "Tudo isto — sem abrir uma única página. Só a conversar."
```

---

## V12 — Família (criação e gestão)

**Duração:** ~3 min
**User:** Cussei Bento (criador) + Ana (membro convidado)

### Roteiro passo a passo

```
CENA 1: Criar família (30s)
  - Cussei no dashboard pessoal
  - Click "Pessoal" → "Criar Família" (ou via settings)
  - Nome: "Família Cussei"
  - Moeda: Kz
  - Guardar → redirect para dashboard familiar
  - Highlight: "Cria uma família em segundos"

CENA 2: Convidar membro (20s)
  - Navegar a /family/members
  - Copiar código de convite
  - Highlight: "Partilha o código com quem queres convidar"

CENA 3: Ana junta-se (30s)
  - Logout, login como Ana
  - Ana vai a Definições → "Juntar-me a uma família"
  - Cola o código de convite
  - Admin aprova → Ana tem acesso
  - Highlight: "O familiar junta-se com o código — o admin aprova"

CENA 4: Criar conta partilhada (20s)
  - Cussei cria "Conta Família" em /family/accounts
  - Tipo: Banco, Saldo: 100.000 Kz
  - Highlight: "Uma conta que todos os membros podem usar"

CENA 5: Ambos registam gastos (30s)
  - Cussei regista uma despesa na Conta Família: Gasolina 15K
  - Ana regista outra: Supermercado 20K
  - Dashboard familiar mostra ambas
  - "Gastos por Membro" mostra quem gastou o quê
  - Highlight: "Total transparência — cada membro vê o que todos gastam"

CENA 6: Orçamento familiar (20s)
  - Cussei cria orçamento familiar
  - Gastos de AMBOS contam contra o limite
  - Highlight: "O orçamento agrega gastos de toda a família"
```

---

## V13 — Relatórios e Score

**Duração:** ~2 min
**User:** Cussei Bento

### Roteiro passo a passo

```
CENA 1: Página de relatórios (15s)
  - Navegar a /reports
  - Gastos por categoria (pie chart)
  - Highlight: "Visualiza para onde vai o teu dinheiro"

CENA 2: Património (15s)
  - Secção de património
  - Activos vs Passivos
  - Net worth
  - Highlight: "Sabe exactamente quanto tens — activos menos dívidas"

CENA 3: Evolução mensal (15s)
  - Gráfico receitas vs despesas por mês
  - Tendência de poupança
  - Highlight: "Acompanha a tua evolução financeira ao longo do tempo"

CENA 4: Score via assistente (30s)
  - Ir ao assistente
  - "Qual é o meu score financeiro?"
  - Score detalhado com factores
  - Highlight: "Score personalizado que te diz exactamente o que melhorar"

CENA 5: Sugestão de orçamento via assistente (20s)
  - "Sugere-me um orçamento"
  - Agente analisa últimos 3 meses e propõe limites
  - Highlight: "O assistente cria orçamentos baseados nos teus hábitos reais"
```

---

## Lições Aprendidas (gravação V02 + V11)

Regras obrigatórias para todos os scripts, derivadas de erros reais
encontrados durante a gravação dos primeiros 2 vídeos.

### L1. Conversa contínua — NUNCA usar `newConversation()`

**Problema:** `newConversation()` clica "Nova conversa" → limpa todo o chat → flash visual de tela vazia → pergunta nova → espera → resposta. No vídeo parece um bug.

**Regra:** Todas as perguntas ao assistente devem ficar na mesma conversa. As mensagens acumulam-se como numa conversa real. O LLM recebe o histórico, o que até melhora as respostas (contexto).

**Excepção:** Apenas usar `newConversation()` quando se muda de contexto (pessoal → família) ou quando o LLM está claramente confuso (raro).

### L2. Navegação via `page.goto()` — NUNCA `page.click('a[href=...]')`

**Problema:** Clicar em links da sidebar falha se o sidebar não expandiu, se o link não está visível (scroll), ou se um tour overlay está a bloquear.

**Regra:** Usar sempre `page.goto("/path")` para navegar entre páginas. É determinístico e independente do estado da UI.

### L3. Phrasing de receitas — ser explícito

**Problema:** "A família recebeu 120000 de mesada" → LLM interpretou como "pagaram mesada ao filho" (despesa) e pediu esclarecimento → script ficou preso.

**Regra para receitas:**
- ✅ "recebi 75000 de um cliente pelo projecto mobile"
- ✅ "recebemos 120000 de rendimento de freelance na conta da família"
- ❌ "a família recebeu 120000 de mesada mensal" (ambíguo)
- ❌ "entrou 50000 na conta" (muito vago)

Padrão seguro: **"recebi/recebemos [valor] de [fonte] [pelo/por/na] [detalhe]"**

### L4. Asserções — NUNCA exactas, SEMPRE regex + try/catch

**Problema:** `expect(text="BAI Conta Ordem")` falha porque o LLM pode abreviar, formatar diferente, ou usar sinónimos.

**Regras:**
```typescript
// ❌ ERRADO — texto exacto
await expect(page.locator("text=BAI Conta Ordem")).toBeVisible()

// ✅ CORRECTO — regex flexível
await expect(page.locator("text=/BAI|BFA|Carteira|saldo/i").first()).toBeVisible({ timeout: 15000 })

// ✅ CORRECTO — try/catch para cenas que dependem do LLM
try {
  await sendChat(page, "posso comprar um televisor?")
  await page.waitForTimeout(5000)
} catch { /* continue filming */ }
```

Cenas que usam o LLM (score, can_afford, relatório) devem SEMPRE estar em try/catch porque o LLM pode:
- Demorar mais que o timeout
- Retornar "Erro ao processar mensagem" (stream error)
- Responder com formato inesperado

### L5. Tours — marcar como vistos ANTES de gravar

**Problema:** O guided tour (driver.js) aparece na primeira visita a cada página, bloqueando a interacção e poluindo o vídeo com popovers inesperados.

**Regra:** O `login()` helper já faz `localStorage.clear()` — isto reseta os tours. O `dismissTour()` helper fecha qualquer tour que apareça. Mas para vídeos limpos, o ideal é pré-marcar todos os tours como vistos:

```typescript
await page.evaluate(() => {
  const tours = [
    "dashboard", "transactions", "budget", "goals", "debts",
    "investments", "assets", "reports", "income-sources", "bills",
    "recurring-rules", "assistant", "accounts",
    "family-dashboard", "family-members"
  ]
  tours.forEach(t => localStorage.setItem(`tour_seen:${t}`, "1"))
})
```

Ou, se o vídeo É sobre o tour (V02), deixar apenas o tour dessa página activo.

### L6. Dados únicos por corrida

**Problema:** Correr o script V11 duas vezes cria transacções duplicadas ("almoço Ponto Final 8500" aparece 2x).

**Regra:** Cada corrida deve usar descrições/valores ligeiramente diferentes, OU os scripts devem fazer cleanup no final. Para vídeos, o mais simples é:
- Usar descrições com timestamp: "Almoço Ponto Final (demo)"
- Ou aceitar que cada corrida adiciona dados (e fazer cleanup manual depois)

### L7. Timeouts generosos para LLM

**Problema:** O LLM demora 5-15s por resposta. Com `waitForTimeout(2000)` o script avança antes da resposta terminar.

**Regra mínima de espera por tipo de operação:**
| Operação | Timeout mínimo |
|---|---|
| Consulta simples (saldo, lista) | 4s |
| Registo + confirmação | 4s + 3s |
| Análise (gastos, orçamento) | 5s |
| Score / Can-afford / Relatório | 5-6s |
| Navegação entre páginas | 2s |
| Dismiss tour | 1.2s |

### L8. Estrutura de cada vídeo com chat

Todo vídeo que envolva o assistente deve seguir esta estrutura:

```
1. Login + navegar ao /assistant (ou /family/assistant)
2. Todas as interacções no chat SEM sair da página
   - Conversa contínua (sem newConversation)
   - Despesas E receitas (nunca só despesas)
   - try/catch nas operações complexas do LLM
3. Navegar às páginas para validar (uma passada sequencial)
   - page.goto() para cada página
   - dismissTour() em cada
   - waitForTimeout(2000-2500) para o user ler
4. Dashboard no final (fecho visual)
```

---

## Notas de Produção

### Configuração Playwright para gravação

```typescript
// No spec file (não precisa de config separado)
test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})
```

### Helpers disponíveis (`e2e/videos/helpers.ts`)

```typescript
login(page, phone)           // limpa localStorage, login, espera dashboard
sendChat(page, message)      // preenche input, Enter, espera resposta
newConversation(page)        // click "Nova conversa" (usar com cautela — ver L1)
dismissTour(page)            // fecha tour driver.js se visível
switchToFamily(page, name)   // click context switcher → família
waitForChatResponse(page)    // espera "A preparar..." desaparecer
```

### Overlays e legendas

Cada cena tem um `Highlight` — este texto deve ser mostrado como card overlay no vídeo (pode ser adicionado em pós-produção com ffmpeg ou directamente no Playwright via inject de div temporário).

### Ordem de gravação recomendada

1. Preparar seed completo (`scripts/seed_demo.py` + `scripts/seed_video_data.py`)
2. Gravar V11 (assistente — o mais importante e o mais sensível ao LLM)
3. Gravar V02 (tour pessoal — simples, sem LLM)
4. Gravar V03 (tour família)
5. Gravar V04-V10 (funcionalidades individuais)
6. Gravar V01 (registo — precisa de user temporário)
7. Gravar V12-V13 (família + relatórios)
