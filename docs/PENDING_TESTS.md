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
- [x] "Gastei 5000 com almoço" → "sim, mas são 8000 na carteira" — registou 8000 na Carteira ✅ DB confirmada
- [ ] "Gastei 5000 com almoço" → "sim, mas é quarta parcela" — deve registar com descrição corrigida
- [x] Verificar na DB que os dados corrigidos foram efectivamente guardados ✅

### 1.3 Update de Transacção via Chat
- [x] "Muda a descrição da última transacção para jantar no restaurante" — usou update_transaction ✅ DB confirmada
- [ ] "Altera o valor da transacção de gasolina para 15000" — deve actualizar valor + reverter saldo
- [x] Verificar na DB que o update foi feito ✅

### 1.4 Delete de Transacção via Chat
- [x] "Apaga a transacção de jantar no restaurante" — pediu confirmação e eliminou ✅
- [x] Verificar na DB que a transacção foi removida e saldo revertido ✅ Carteira voltou a 219.500 Kz
- [ ] Sonner toast deve aparecer para delete

### 1.5 Selecção de Conta
- [x] "Gastei 5000 com almoço" → "sim, na carteira" — registou na Carteira ✅ DB confirmada (sessão anterior)
- [x] "Gastei 5000, registra no BFA" — registou no BFA Poupança ✅ (sessão anterior)
- [x] Verificar na DB que o account_id correcto foi usado ✅

### 1.6 Categorias Correctas
- [x] "Gastei com gasolina" — atribuiu "Gasóleo / Gasolina" ✅ (sessão anterior)
- [ ] "Gastei no Kero" — deve atribuir "Supermercado"
- [ ] "Recebi salário" — deve atribuir "Salário"
- [ ] Verificar na DB que o category_id correcto foi atribuído

### 1.7 Data Correcta
- [ ] "Que dia é hoje?" — deve responder 2026, não 2025
- [ ] Transacções registadas devem ter data de hoje

### 1.8 Acentuação
- [x] Respostas com acentuação correcta ✅ ("Descrição", "transacção", "Alimentação" observadas)
- [ ] Verificar ausência total de "Marco", "familia", "orcamento"

### 1.9 Gráficos Inline (Visualização)
- [x] "Mostra resumo dos gastos com gráfico" — Chart.js doughnut + metric cards ✅ (sessão anterior)
- [x] "Quanto tenho nas contas?" — metric cards automáticos ✅ (sessão anterior)
- [ ] Gráficos devem funcionar em dark mode

### 1.10 Progresso em Tempo Real (SSE)
- [x] Mensagens de progresso aparecem ✅ ("A analisar o teu pedido...", "A preparar resposta...")
- [x] Progresso muda conforme as tools são executadas ✅

### 1.11 Web Search / Notícias
- [x] "Notícias financeiras de Angola" — pesquisou na web em tempo real ✅ (sessão anterior)
- [ ] Fontes devem ser links clicáveis que abrem em nova aba (fix aplicado, não retestado)
- [ ] Data nas notícias deve ser 2026 (fix aplicado, não retestado)

### 1.12 Contexto Familiar
- [x] Mudar para "Família Cussei" e perguntar saldo — mostrou apenas conta família 180.000 Kz ✅ (sessão anterior)
- [x] Não misturou dados pessoais com familiares ✅

---

## 2. Testes de Regressão — UI de Dívidas (Router Refactored)

### 2.1 CRUD Dívidas
- [x] Listar dívidas — página /debts carregou com 2 dívidas ✅
- [ ] Criar nova dívida — formulário deve funcionar
- [ ] Editar dívida — alterar nome/saldo/pagamento
- [ ] Eliminar dívida — deve remover da lista

### 2.2 Pagamentos de Dívida
- [x] Registar pagamento — 20.000 Kz no Empréstimo do João, saldo reduziu para 60.000 Kz ✅
- [ ] Pagamento que zera o saldo — deve marcar como "paid_off"
- [ ] Verificar que a transacção de pagamento aparece no histórico

### 2.3 Simulação de Dívida
- [x] Bug corrigido: frontend agora converte % → basis points ✅
- [ ] Retestar simulação após fix

---

## 3. Testes de Regressão — UI de Investimentos (Router Refactored)

### 3.1 CRUD Investimentos
- [x] Listar investimentos — 2 investimentos com performance ✅
- [x] Criar novo investimento — "Certificado Aforro BFA" criado com sucesso ✅
- [ ] Editar investimento — alterar valor actual
- [ ] Eliminar investimento — deve remover da lista

### 3.2 Analytics de Investimentos
- [x] Performance — total investido vs valor actual ✅
- [x] Alocação — breakdown por tipo com percentagens ✅
- [x] Insights — alerta de concentração detectado ✅
- [ ] Histórico de performance — gráfico mensal
- [ ] Simulação de juros compostos

### 3.3 Score de Diversificação
- [x] Score calculado (86/100) ✅
- [x] Perfil de risco: conservador ✅

---

## 4. Testes das Novas Tools via Assistente

### 4.1 Budget
- [ ] "Edita o meu orçamento para 500000 Kz" — deve usar update_budget
- [ ] "Apaga o meu orçamento" — deve pedir confirmação e usar delete_budget

### 4.2 Goals
- [ ] "Muda o valor da meta Carro Novo para 10000000" — deve usar update_goal
- [ ] "Apaga a meta Férias Família" — deve pedir confirmação e usar delete_goal
- [ ] "Quero contribuir 50000 para o Fundo de Emergência" — deve usar contribute_to_goal

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
- [x] Plano FAMILY (Cussei Bento) — actualizado de FREE para FAMILY ✅
- [ ] Mensagem de erro clara quando quota atingida

### 5.3 Sonner Toasts
- [x] Sonner aparece para despesas ("registado") ✅ (sessão anterior — gasolina 12.000 Kz)
- [x] Sonner aparece para receitas ("registada") ✅ (sessão anterior)
- [ ] Sonner aparece para operações de delete ("concluída")

### 5.4 API /tools
- [x] GET /api/v1/tools retorna 24+ tools com metadata ✅ (sessão anterior, agora são 41)

---

## Resumo

| Secção | Total | Testados | Passaram | Pendentes |
|--------|-------|----------|----------|-----------|
| 1. Assistente | 22 | 14 | 14 | 8 |
| 2. Dívidas UI | 8 | 3 | 3 | 5 |
| 3. Investimentos UI | 10 | 6 | 6 | 4 |
| 4. Novas tools | 12 | 0 | 0 | 12 |
| 5. Gerais | 6 | 3 | 3 | 3 |
| **Total** | **58** | **26** | **26** | **32** |
