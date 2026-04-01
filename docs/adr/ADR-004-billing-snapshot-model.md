# ADR-004: Modelo de Subscrição com Snapshot

**Data:** 2026-03-31
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

O sistema de billing precisa de:
- Planos editáveis sem afectar subscribers existentes
- Promoções com regras complexas (%, valor fixo, dias grátis, prioridade, limites)
- Custo dinâmico com membros extra e add-ons
- Preparação para Stripe sem dependência

## Decisão

### Snapshot Model
`UserSubscription` guarda um `plan_snapshot` (JSONB) — cópia completa do plano no momento da subscrição. Se o admin actualizar o plano, subscribers existentes mantêm o snapshot original.

### Pricing Engine
```
final_price = base_price - discount + extra_members_cost + module_addons_cost
```

- `base_price` — do plano (mensal ou anual)
- `discount` — promoção (%, valor fixo, ou 100% para free_days)
- `extra_members_cost` — (membros_activos - max_incluido) × custo_por_membro
- `module_addons_cost` — soma de module add-ons

### Promoções
- `priority` — lower = higher priority, para resolver conflitos
- `auto_apply_on_register` — aplicada automaticamente no registo
- `max_beneficiaries` — controlo de quantidade
- `FREE_DAYS` type → 100% desconto durante N dias

### Não Há Plano Gratuito
Acesso gratuito é via promoção (ex: 90 dias grátis no lançamento). Sem promoção activa, o utilizador deve subscrever.

## Alternativas Consideradas

1. **Referência ao plano (FK)** — alterações afectariam todos os subscribers
2. **Plano gratuito permanente** — dificulta monetização, utilizadores nunca convertem
3. **Pricing fixo sem promoções** — inflexível para marketing

## Consequências

- Admin pode mudar preços/features sem impacto em subscribers actuais
- Promoções de lançamento (90 dias grátis) atraem utilizadores
- Custo familiar escala com membros (justo e rentável)
- Stripe integração preparada (customer_id, subscription_id nos modelos)
