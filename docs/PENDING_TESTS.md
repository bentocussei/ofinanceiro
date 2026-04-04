# Testes Pendentes — O Financeiro

**Data:** 2026-04-05
**Contexto:** Refactoring do agentic system (skills, tool registry, services) + novas tools CRUD

---

## 1. Testes Pendentes do Assistente (Agentic System)

### 1.1 OCR de Facturas
- [ ] Upload de factura térmica (fatura_termica.jpg) — deve extrair comerciante, itens, total via Claude Vision
- [ ] Upload de factura A4 normal — deve extrair dados e propor registo
- [ ] Upload de imagem ilegível — deve informar que não consegue ler e pedir dados manualmente
- [ ] Verificar que a imagem aparece no chat após upload

### 1.2 Correcção na Confirmação
- [ ] "Gastei 5000 com almoço" → "sim, mas são 8000" — deve registar 8000, não 5000
- [ ] "Gastei 5000 com almoço" → "sim, mas é quarta parcela" — deve registar com descrição corrigida
- [ ] Verificar na DB que os dados corrigidos foram efectivamente guardados

### 1.3 Update de Transacção via Chat
- [ ] "Muda a descrição da última transacção para X" — deve usar update_transaction tool
- [ ] "Altera o valor da transacção de gasolina para 15000" — deve actualizar valor + reverter saldo
- [ ] Verificar na DB que o update foi feito e saldo da conta recalculado

### 1.4 Delete de Transacção via Chat
- [ ] "Apaga a última transacção" — deve pedir confirmação e depois eliminar
- [ ] Verificar na DB que a transacção foi removida e saldo revertido
- [ ] Sonner toast deve aparecer

### 1.5 Selecção de Conta
- [ ] "Gastei 5000 com almoço" → "sim, na carteira" — deve registar na Carteira (não BAI)
- [ ] "Gastei 5000, registra no BFA" — deve registar no BFA Poupança
- [ ] Verificar na DB que o account_id correcto foi usado

### 1.6 Categorias Correctas
- [ ] "Gastei com gasolina" — deve atribuir "Gasóleo / Gasolina", não "Combustível" inventado
- [ ] "Gastei no Kero" — deve atribuir "Supermercado"
- [ ] "Recebi salário" — deve atribuir "Salário"
- [ ] Verificar na DB que o category_id correcto foi atribuído

### 1.7 Data Correcta
- [ ] "Que dia é hoje?" — deve responder 2026, não 2025
- [ ] Transacções registadas devem ter data de hoje

### 1.8 Acentuação
- [ ] Todas as respostas devem ter acentuação correcta (Março, família, orçamento)
- [ ] Sem "Marco", "familia", "orcamento" nas respostas

### 1.9 Gráficos Inline (Visualização)
- [ ] "Como estão as minhas finanças?" — deve mostrar Chart.js, nunca ASCII art
- [ ] "Quanto tenho nas contas?" — deve mostrar metric cards automaticamente
- [ ] Gráficos devem funcionar em dark mode

### 1.10 Progresso em Tempo Real (SSE)
- [ ] Mensagens de progresso aparecem durante a espera ("A consultar saldos...", "A pesquisar na internet...")
- [ ] Progresso muda conforme as tools são executadas (não é estático)

### 1.11 Web Search / Notícias
- [ ] "Notícias financeiras de Angola" — deve pesquisar na web em tempo real
- [ ] Fontes devem ser links clicáveis que abrem em nova aba
- [ ] Data nas notícias deve ser 2026

### 1.12 Contexto Familiar
- [ ] Mudar para contexto "Família Cussei" e perguntar saldo — deve mostrar apenas conta família (180.000 Kz)
- [ ] Não deve misturar dados pessoais com familiares

---

## 2. Testes de Regressão — UI de Dívidas (Router Refactored)

### 2.1 CRUD Dívidas
- [ ] Listar dívidas — página /debts deve carregar normalmente
- [ ] Criar nova dívida — formulário deve funcionar, dívida deve aparecer na lista
- [ ] Editar dívida — alterar nome/saldo/pagamento, verificar que actualiza
- [ ] Eliminar dívida — deve remover da lista

### 2.2 Pagamentos de Dívida
- [ ] Registar pagamento — deve debitar conta, criar transacção, reduzir saldo
- [ ] Pagamento que zera o saldo — deve marcar como "paid_off"
- [ ] Verificar que a transacção de pagamento aparece no histórico de transacções

### 2.3 Simulação de Dívida
- [ ] Simulação de aceleração — deve calcular meses e juros poupados
- [ ] Simulação com pagamento extra — valores devem ser correctos

---

## 3. Testes de Regressão — UI de Investimentos (Router Refactored)

### 3.1 CRUD Investimentos
- [ ] Listar investimentos — página /investments deve carregar normalmente
- [ ] Criar novo investimento — formulário deve funcionar
- [ ] Editar investimento — alterar valor actual, verificar que actualiza
- [ ] Eliminar investimento — deve remover da lista

### 3.2 Analytics de Investimentos
- [ ] Performance — total investido vs valor actual
- [ ] Alocação — breakdown por tipo com percentagens
- [ ] Insights — alertas de concentração, vencimento, retorno negativo
- [ ] Histórico de performance — gráfico mensal
- [ ] Simulação de juros compostos — projecções correctas

### 3.3 Score de Diversificação
- [ ] Score deve ser calculado (0-100)
- [ ] Perfil de risco (conservador/moderado/agressivo)

---

## 4. Testes das Novas Tools via Assistente

### 4.1 Budget
- [ ] "Edita o meu orçamento para 500000 Kz" — deve usar update_budget
- [ ] "Apaga o meu orçamento" — deve pedir confirmação e usar delete_budget

### 4.2 Goals
- [ ] "Muda o valor da meta Carro Novo para 10000000" — deve usar update_goal
- [ ] "Apaga a meta Férias Família" — deve pedir confirmação e usar delete_goal
- [ ] "Quero contribuir 50000 para o Fundo de Emergência" — deve usar contribute_to_goal, debitar conta

### 4.3 Debts
- [ ] "Tenho uma nova dívida de 500000 no BAI" — deve usar create_debt
- [ ] "Actualiza o saldo da dívida do João para 40000" — deve usar update_debt
- [ ] "Apaga a dívida do João" — deve pedir confirmação e usar delete_debt

### 4.4 Investments
- [ ] "Fiz um depósito a prazo de 200000 no BFA" — deve usar create_investment
- [ ] "O valor do meu investimento subiu para 2200000" — deve usar update_investment
- [ ] "Apaga o investimento X" — deve pedir confirmação e usar delete_investment

---

## 5. Testes Gerais

### 5.1 Autenticação
- [ ] Token expira → deve redirecionar para /login automaticamente
- [ ] Refresh token funciona durante uso normal

### 5.2 Quotas
- [ ] Plano FAMILY (Cussei Bento) — deve permitir 200 msg/dia
- [ ] Mensagem de erro clara quando quota atingida

### 5.3 Sonner Toasts
- [ ] Sonner aparece para despesas ("registado")
- [ ] Sonner aparece para receitas ("registada")
- [ ] Sonner aparece para operações de delete ("concluída")

### 5.4 API /tools
- [ ] GET /api/v1/tools retorna todas as 41 tools com metadata correcta
