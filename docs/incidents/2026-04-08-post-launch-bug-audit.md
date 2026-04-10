# Post-Launch Bug Audit — 8-10 Abril 2026

**Contexto:** Plataforma lançada em produção com utilizadores reais. Auditoria sistemática de segurança, integridade de dados e isolamento de contexto pessoal/família.

**Método:** Análise de código + reprodução E2E via Playwright + validação SQL log.

**Resultado:** 22 bugs identificados, 22 resolvidos.

---

## Bugs Críticos (corrupção de dados / crash em produção)

### BUG-001: int32 overflow em colunas monetárias
- **Data:** 2026-04-08
- **Impacto:** Utilizadora tentou criar dívida de 500M Kz → HTTP 500 (`asyncpg DataError: value out of int32 range`)
- **Causa:** 54 colunas monetárias usavam `Integer` (max ~21M Kz em centavos)
- **Fix:** Migração Alembic `0863eb1635fe` + `58cbe0aab963` — todas as colunas para `BigInteger` (int64)
- **ADR:** `docs/adr/ADR-011-money-as-bigint-centavos.md`
- **Validação:** E2E Playwright — criação de dívida 500M Kz com sucesso

### BUG-002: update_debt não mantém invariante balance/original
- **Data:** 2026-04-09
- **Impacto:** Editar `original_amount` de uma dívida deixava `current_balance` inalterado → "-100% pago", barra de progresso cheia, estado impossível
- **Causa:** `update_debt` era um `setattr` loop ingénuo sem recálculo
- **Fix:** Invariantes enforced no service: `original_amount` imutável após pagamentos; se sem pagamentos, `current_balance` sincroniza com novo original; rejeita `current_balance > original_amount` com 422
- **Migração:** `a1c4e2f9b8d3` — reparação idempotente de rows inconsistentes
- **Validação:** E2E Playwright — edit 1M→500K: modal+lista mostram 500K/0% pago

### BUG-003: Race condition em pagamentos concorrentes
- **Data:** 2026-04-09
- **Impacto:** 5 pagamentos simultâneos de 1M contra mesma dívida → só 1M descontado (4 decrementos perdidos)
- **Causa:** Sem `SELECT FOR UPDATE`; SQLAlchemy session cache devolvia `current_balance` velho mesmo com lock adquirido
- **Fix:** `SELECT ... FOR UPDATE` + `execution_options(populate_existing=True)` em `register_payment`, `goal.contribute` e `accounts.transfer`. Locks em ordem fixa (debt→account, goal→account, UUID sorted para transfers)
- **Validação:** E2E — 5 pagamentos paralelos: debt 100M→95M, account delta exacto 5M

### BUG-004: Orçamento familiar contava só gastos do criador
- **Data:** 2026-04-09
- **Impacto:** `budget.get_budget_status` usava `Transaction.user_id == budget.user_id` → gastos de outros membros da família invisíveis → "spent" totalmente errado
- **Fix:** JOIN com Account + filtragem por `Account.family_id == budget.family_id` para budgets familiares
- **Validação:** E2E — Ana + Cussei ambos gastam em categoria Alimentação → budget mostra soma de ambos (78K)

### BUG-005: Family layout redirect bloqueava ADULT members
- **Data:** 2026-04-09
- **Impacto:** `FamilyLayoutInner` chamava `router.replace("/dashboard")` durante render quando `hasModuleAccess("family")` retornava false. ADULT members não têm `family:*` perms → SEMPRE redirectados. Contexto família completamente inacessível para não-admin.
- **Causa dupla:** (a) `router.replace()` em render = React warning + redirect loop; (b) `hasModuleAccess("family")` é o gate errado — deve ser membership-based
- **Fix:** Removido o gate de permissão. Acesso ao layout família decide-se por `family !== null` (é membro?). Permissões per-operation continuam enforced no API.
- **Validação:** E2E Playwright — Ana ADULT vê `/family/dashboard` com dados família correctos

### BUG-006: Agent tools ignoravam ctx.family_id (23 query sites)
- **Data:** 2026-04-09
- **Impacto:** Chat agents (tracker, budget, report, advisor) filtravam por `Account.user_id == ctx.user_id` sem branching família. Em ctx família: (a) `_get_balance` mostrava contas pessoais; (b) `_add_transaction` falhava com "conta não encontrada" ao usar Conta Família; (c) relatórios/score/cashflow mostravam dados pessoais em vez de família
- **Fix:** Criado `app/ai/agents/_filters.py` com helpers `scope_to_context` / `scope_transactions_to_context`. 23 sites refactorados nos 4 agentes.
- **Validação:** E2E 4 contextos (Cussei pessoal, Cussei família, Ana pessoal, Ana família) — SQL logs confirmam filtros correctos em todas as queries

### BUG-007: Orchestrator snapshot leaks pessoal↔família
- **Data:** 2026-04-09
- **Impacto:** O "financial data" snapshot dado ao LLM tinha 4 leaks: recent transactions (sem branching), budgets (sem branching), goals/debts (family branch mantinha user_id espúrio → escondia itens de outros membros)
- **Fix:** 4 secções corrigidas com branching `is_family` consistente
- **Validação:** SQL log — todas as 5 secções do snapshot com `family_id IS NULL` (pessoal) ou `family_id = $` (família)

### BUG-008: Decimal not JSON serializable (pré-existente, mascarado)
- **Data:** 2026-04-10 (descoberto durante validação de BUG-006)
- **Impacto:** Qualquer tool que fizesse `SUM()` sobre coluna BigInt crashava com `TypeError: Object of type Decimal is not JSON serializable` → "Erro ao processar mensagem" no chat. Afectava: score financeiro, cashflow, can_afford, suggest_budget.
- **Causa:** PostgreSQL `SUM(BIGINT)` retorna `numeric` → asyncpg mapeia para Python `Decimal` → `json.dumps` não serializa
- **Mascaramento:** `/chat/stream` tinha `except Exception: yield "Erro ao processar"` que escondia o traceback
- **Fix:** `_json_default` em `base.py` que converte Decimal→float, datetime→isoformat, UUID→str. Aplicado a todos os `json.dumps` no agent loop.
- **Validação:** "Qual é o meu score financeiro?" → resposta completa com Score 80/100

### BUG-009: InvestmentCreate dates como str
- **Data:** 2026-04-09
- **Impacto:** Criar investimento com `start_date` crashava com `'str' object has no attribute 'toordinal'`
- **Causa:** Schema `InvestmentCreate.start_date: str` mas coluna é `Date`. Mesmo padrão que `DebtCreate` já corrigido.
- **Fix:** Retyped para `date | None` em Create, Update e Response schemas
- **Validação:** Investimento criado com `start_date` via API → sem erro

---

## Bugs Importantes (UX degradado, sem corrupção)

### BUG-010: 11 detail modals com snapshot stale
- **Data:** 2026-04-09
- **Impacto:** Após editar um item (dívida, meta, investimento, orçamento, património), o modal mantinha-se aberto a mostrar os valores antigos. A lista refrescava mas o modal não.
- **Causa:** `useState<Item | null>` guardava snapshot ao click. Após `onUpdated()` refetch, o snapshot não era actualizado.
- **Fix:** Padrão `useMemo` — guardar apenas o ID, derivar o item da lista via `useMemo`. 10 páginas (5 pessoal + 5 família) refactoradas.
- **Validação:** E2E Playwright — edit dívida 1M→500K: modal mostra 500K imediatamente sem reabrir

### BUG-011: Pct nas metas podia mostrar >100% ou negativo
- **Data:** 2026-04-09
- **Impacto:** Se target < current (over-saving), badge mostrava "166% pago" com barra a transbordar
- **Fix:** `Math.max(0, Math.min(100, rawPct))` + texto "excedida em N%". Aplicado a `GoalDetailDialog` e páginas de goals.
- **Validação:** E2E — target 100K, contribuição 50K, edit target→30K: badge mostra "100% — excedida em 67%"

### BUG-012: update_goal não reactivava de COMPLETED → ACTIVE
- **Data:** 2026-04-09
- **Impacto:** Reduzir target abaixo de current → goal auto-completed. Depois subir target acima de current → goal ficava stuck em COMPLETED.
- **Fix:** Branch simétrico: `elif current < target and status == COMPLETED → status = ACTIVE, completed_at = None`
- **Validação:** E2E — target 30K→200K: goal voltou a "Activas", pct 25%

### BUG-013: apiFetch error parsing
- **Data:** 2026-04-08
- **Impacto:** Qualquer erro da API mostrava "Erro desconhecido" no frontend, mesmo quando o backend enviava mensagem específica (e.g. "Não é possível alterar o valor original")
- **Fix:** `lib/api/client.ts` agora parseia 3 shapes: `detail: string`, `detail: { message }`, `detail: [{ msg }]`
- **Validação:** Erros 422 agora mostram a mensagem real do backend

### BUG-014: Delete debt/goal deixava source_id orfão
- **Data:** 2026-04-09
- **Impacto:** Transactions criadas por pagamentos de dívida ou contribuições a metas mantinham `source_id` apontando para row eliminada
- **Fix:** `UPDATE transactions SET source_type=NULL, source_id=NULL WHERE source_id=parent.id` antes do delete
- **Validação:** E2E — criar dívida, pagar, eliminar → transacção existe mas source_id=null

### BUG-015: goals.contribute permission gate inconsistente
- **Data:** 2026-04-09
- **Impacto:** Ana ADULT podia pagar dívida familiar (`can_add_transactions`) mas não contribuir para meta familiar (`can_edit_budgets`)
- **Fix:** Mudado para `can_add_transactions` — contribuir é fluxo de dinheiro, não mudança estrutural
- **Validação:** E2E — Ana contribui 2.5K para meta familiar → 201 OK

### BUG-016: expense_splits bypass do FinanceContext
- **Data:** 2026-04-09
- **Impacto:** Fazia lookup próprio do family_id via DB em vez de usar `ctx.family_id`. GET endpoint não tinha PlanPermission.
- **Fix:** Refactorado para usar `ctx.family_id` / `ctx.is_family`. Personal ctx → `200 []`. Write ops → `400 NO_FAMILY_CONTEXT`.

### BUG-017: reports/patrimony investments+debts ignoravam ctx
- **Data:** 2026-04-09
- **Impacto:** Relatório familiar mostrava apenas investments/debts do user autenticado, não de toda a família
- **Fix:** Branching `ctx.is_family` adicionado (mesmo padrão que goals/assets já tinham)
- **Validação:** E2E — Ana em ctx família vê "Poupança familiar BAI" (31.5M) + "Electrodomésticos casa" (800K) criados por Cussei

### BUG-018: /chat/stream except Exception silencioso
- **Data:** 2026-04-10
- **Impacto:** Qualquer excepção no streaming (incluindo BUG-008) era engolida sem log → "Erro ao processar mensagem" sem traceback para debug
- **Fix:** `logger.exception("chat stream failed: %s", e)` antes do yield de erro

---

## Bugs Latentes (defesa em profundidade)

### BUG-019: update_transaction não protegia account_id move
- **Data:** 2026-04-09
- **Impacto:** Se alguém adicionasse `account_id` ao `TransactionUpdate` schema, o setattr loop moveria transacções entre contas sem recalcular saldos. Actualmente não exploitable (schema dropa o campo).
- **Fix:** Refactorado para capturar old/new account_id, validar currency match + ownership, recalcular saldos em ambas as contas

### BUG-020: update_account sem guard contra balance overwrite
- **Data:** 2026-04-09
- **Impacto:** Se alguém adicionasse `balance` ao `AccountUpdate` schema, o setattr sobrescreveria o running total. Actualmente não exploitable.
- **Fix:** Explicit `raise ValueError` se `balance` em update_data

### BUG-021: Transaction idempotency (double-tap)
- **Data:** 2026-04-09
- **Impacto:** `Transaction.client_id` + unique constraint existiam no modelo, mas create_transaction nunca fazia lookup → integrity error 500 em retry, ou duplicate row se sem constraint
- **Fix backend:** Lookup `(user_id, client_id)` no início de `create_transaction` → retorna existente se match
- **Fix frontend:** `crypto.randomUUID()` gerado via `useRef` no submit, preservado em retries, reset no sucesso
- **Validação:** Double-click no botão "Registar despesa" → 1 row em DB com o client_id correcto

### BUG-022: Pct dívidas clamp no badge e barra
- **Data:** 2026-04-09
- **Impacto:** Quando `current_balance > original_amount` (estado impossível pré-fix), badge mostrava "-100% pago" e barra a transbordar
- **Fix:** `Math.max(0, Math.min(100, rawPct))` no `DebtDetailDialog` e páginas de debts (pessoal + família)
- **Validação:** Parte do teste de BUG-002

---

## Linha temporal

| Data | Sessão | Bugs encontrados | Commits |
|---|---|---|---|
| 2026-04-08 | Post-launch hardening início | BUG-001 | BigInt migration + Sentry + rate limiting |
| 2026-04-09 | Debt invariants + audit | BUG-002 a BUG-022 | 7 commits (invariants, B1-B6, F1-F6, race/idempotency, agents) |
| 2026-04-10 | Agent ctx validation | BUG-006 a BUG-008 (agentes + Decimal/JSON) | 1 commit final |

---

## Lições aprendidas

1. **`setattr` loops ingénuos em services são uma bomba-relógio.** Cada update service deve enforcer invariantes explícitas, não delegar ao modelo.
2. **`except Exception` silencioso mascara bugs reais.** Nunca engolir sem `logger.exception`.
3. **Testes com valores pequenos escondem overflow.** Testes devem incluir limites superiores realistas para o mercado.
4. **`populate_existing=True` é mandatório** quando se adquire um lock `FOR UPDATE` sobre uma row já cacheada na sessão SQLAlchemy.
5. **family_id branching deve ser centralizado** (helpers/mixin), não copy-pasted em 23 sites — cada cópia é uma oportunidade de esquecer.
6. **PostgreSQL `SUM(BIGINT)` retorna `numeric`** (não `bigint`), que asyncpg mapeia para `Decimal`. JSON serialization precisa de fallback.
7. **Validação E2E real** (Playwright + SQL log) é insubstituível — testes de serviço não apanham bugs de rendering/routing/session.
