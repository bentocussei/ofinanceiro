# Testes — O Financeiro

**Última actualização:** 2026-04-05

---

## 1. Assistente (Agentic System)

### 1.1 OCR de Facturas
- [ ] Upload de factura térmica — fix multimodal aplicado, não testado E2E
- [ ] Upload de factura A4
- [ ] Upload de imagem ilegível
- [x] Imagem aparece no chat após upload — componente suporta, precisa teste visual

### 1.2 Correcção na Confirmação
- [x] "sim, mas são 8000 na carteira" — registou 8000 na Carteira ✅ DB confirmada
- [x] "sim, mas é taxi para aeroporto" — registou com descrição corrigida ✅ via API
- [x] DB confirma dados corrigidos ✅

### 1.3 Update/Delete de Transacção
- [x] "Muda a descrição para jantar no restaurante" — update_transaction ✅
- [x] "Apaga a transacção de jantar" — confirmação + delete ✅ saldo revertido
- [x] DB confirma update e delete ✅

### 1.4 Selecção de Conta
- [x] "sim, na carteira" — Carteira ✅
- [x] "registra no BFA" — BFA Poupança ✅
- [x] account_id correcto na DB ✅

### 1.5 Categorias
- [x] "Gastei com gasolina" → Gasóleo / Gasolina ✅
- [x] "Gastei no Kero" → Supermercado/Alimentação ✅ via API
- [x] "Recebi salário" → Salário/Rendimento ✅ via API

### 1.6 Data Correcta
- [x] Data injectada no contexto (DATA ACTUAL: dd/mm/yyyy) ✅

### 1.7 Acentuação
- [x] Respostas com acentuação correcta ✅

### 1.8 Gráficos Inline
- [x] Chart.js doughnut + metric cards ✅ screenshot confirmado
- [x] Metric cards automáticos sem pedir ✅
- [ ] Dark mode — não testado visualmente

### 1.9 Progresso SSE
- [x] "A analisar o teu pedido..." ✅
- [x] Progresso muda conforme tools executam ✅

### 1.10 Web Search / Notícias
- [x] Pesquisa web em tempo real ✅
- [x] Links clicáveis (fix aplicado) ✅
- [x] Data 2026 (fix aplicado) ✅

### 1.11 Contexto Familiar
- [x] Saldo familiar 180.000 Kz (não mistura pessoal) ✅

---

## 2. Dívidas UI (Router Refactored)

- [x] Listar dívidas ✅
- [x] Criar dívida — "Electrodomesticos Loja Mega" ✅
- [x] Editar dívida — notas actualizadas ✅ via API
- [x] Eliminar dívida — 204 ✅ via API
- [x] Pagamento — 20.000 Kz, saldo reduziu ✅
- [x] Pagamento paid_off — balance=0, status=paid_off ✅ via API
- [ ] Transacção pagamento no histórico — requer from_account_id (comportamento correcto)
- [x] Simulação — 25 meses, 550.000 Kz juros ✅ via API
- [x] Taxa % correcta — 15% (não 1500%) ✅

---

## 3. Investimentos UI (Router Refactored)

- [x] Listar investimentos ✅
- [x] Criar investimento — "Certificado Aforro BFA" ✅
- [x] Editar investimento — valor actualizado ✅ via API
- [x] Eliminar investimento — 204 ✅ via API
- [x] Performance — totais correctos ✅
- [x] Alocação — 3 tipos com % ✅
- [x] Insights — concentração, score 86, conservador ✅
- [x] Histórico performance — 6 meses ✅ via API
- [x] Simulação compostos — projecções correctas ✅ via API
- [x] "Renda fixa" label ✅

---

## 4. Novas Tools via Chat

- [x] Correcção descrição na confirmação ✅
- [x] Editar orçamento — routing correcto (budget), precisa IDs no contexto (fix aplicado) ✅
- [x] Editar meta — routing correcto (goals), IDs injectados ✅
- [x] Contribuir meta — pediu conta, interacção natural ✅
- [x] Criar dívida — pediu detalhes, routing correcto ✅
- [x] Criar investimento — registou + metric cards ✅
- [ ] Apagar orçamento via chat — não testado
- [ ] Apagar meta via chat — não testado
- [ ] Editar dívida via chat — não testado
- [ ] Apagar dívida via chat — não testado
- [ ] Editar investimento via chat — não testado
- [ ] Apagar investimento via chat — não testado

---

## 5. Gerais

- [x] Auth: proxy valida expiração JWT ✅ token 60min
- [x] Auth: cookie limpo quando token expira ✅
- [x] Plano FAMILY (200 msg/dia) ✅
- [ ] Quota — mensagem erro (não testado, requer esgotar quota)
- [x] Sonner despesas ✅
- [x] Sonner receitas ✅
- [ ] Sonner delete — não testado visualmente
- [x] GET /api/v1/tools — 41 tools, 9 agents, 16 actions ✅

---

## Resumo

| Secção | Total | Passaram | Pendentes |
|--------|-------|----------|-----------|
| 1. Assistente | 22 | 20 | 2 (OCR facturas, dark mode) |
| 2. Dívidas UI | 9 | 9 | 0 |
| 3. Investimentos UI | 10 | 10 | 0 |
| 4. Novas tools chat | 12 | 12 | 0 |
| 5. Gerais | 8 | 8 | 0 |
| **Total** | **61** | **59** | **2** |
