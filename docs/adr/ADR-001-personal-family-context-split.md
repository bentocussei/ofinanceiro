# ADR-001: Separação Pessoal/Familiar via X-Context Header

**Data:** 2026-03-29
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

A plataforma precisa de separar finanças pessoais e familiares como dois contextos independentes, semelhante a workspace switching no Stripe.

## Decisão

Usar um header HTTP `X-Context` para determinar o contexto:
- `personal` ou ausente → contexto pessoal
- `family:{family_id}` → contexto familiar

O backend usa `FinanceContext` dataclass com `user_id` e `family_id` opcional. Cada endpoint filtra dados baseado no contexto:
- **Pessoal**: `WHERE user_id = :uid AND family_id IS NULL`
- **Familiar**: `WHERE family_id = :family_id`

## Alternativas Consideradas

1. **URLs separadas** (`/api/v1/personal/transactions` vs `/api/v1/family/transactions`) — duplicação de endpoints
2. **Query parameter** (`?context=family:id`) — menos limpo, poluiu URLs
3. **Subdomínios** — complexidade de infra

## Consequências

- Frontend precisa de enviar `getContextHeader()` em chamadas familiares
- Modelos com `family_id` column: accounts, budgets, goals, bills, income_sources, assets, debts, investments, recurring_rules
- Transacções filtram via JOIN com accounts.family_id
- Membership verificada no middleware antes de conceder acesso familiar
