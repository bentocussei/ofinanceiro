# O Financeiro vs GS360 — Análise Comparativa

## Funcionalidades que o GS360 tem e devemos adoptar

### Prioridade ALTA
1. **Fontes de Rendimento (IncomeSource)** — Templates: "Salário 300K dia 25", "Renda 80K dia 5"
2. **Contas a Pagar (Bills)** — Facturas recorrentes com lembretes e auto-pagamento
3. **Divisão de Despesas (ExpenseSplit)** — Dividir conta entre membros da família
4. **Campos bancários em Contas** — IBAN, NIB, SWIFT, titular, limite crédito
5. **Alerta de saldo baixo** — Threshold configurável por conta

### Prioridade MÉDIA
6. **Recurring Transaction como modelo separado** — Templates de transacções recorrentes
7. **Tipo de credor nas dívidas** — BANCO, FINANCEIRA, FAMÍLIA, AMIGOS, etc.
8. **Natureza da dívida** — FORMAL vs INFORMAL
9. **Auto-pagamento de dívidas** — Linked account + auto-pay enabled
10. **Permissões granulares na família** — canAddTransactions, canEditBudgets, canViewAll, canInvite
11. **Relação familiar** — PAI, MÃE, CÔNJUGE, FILHO, etc.
12. **Finance Settings** — Preferências centralizadas (threshold alertas, reminder days, etc.)
13. **Finance Snapshots** — Resumos mensais/anuais auto-gerados
14. **Finance Tags como entidade** — Tags com cor, reutilizáveis, estatísticas

### Prioridade BAIXA (futuro)
15. **Activos (Assets)** — Imóveis, veículos, negócios com avaliação
16. **Round-up savings** — Arredondamento automático para poupança
17. **Sub-contas** — Hierarquia de contas (parent/child)

## Campos em falta nos nossos modelos

### Account — adicionar:
- credit_limit (para cartões de crédito)
- low_balance_alert (threshold)
- usage_type (PERSONAL, SALARY, SAVINGS, BUSINESS, JOINT)

### Transaction — adicionar:
- attachments (array, não apenas receipt_url)
- to_account_id (para transferências)

### Budget — adicionar:
- alert_threshold (percentagem)
- alert_enabled (boolean)

### Goal — adicionar:
- savings_account_id (onde fica o dinheiro)
- auto_frequency (não apenas mensal)

### Debt — adicionar:
- nature (FORMAL/INFORMAL)
- creditor_type (BANCO, FINANCEIRA, FAMÍLIA, etc.)
- linked_account_id + auto_pay_enabled
- is_paid_off + paid_off_at

### Family — adicionar:
- member_relation (PAI, MÃE, CÔNJUGE, FILHO, etc.)
- Permissões granulares por membro
- currency + month_start_day ao nível da família

## Selectores em falta nos formulários

Campos que estão como texto livre e deviam ser dropdowns:
1. Goal type → dropdown (Poupança, Fundo emergência, Compra, Viagem, Evento, Educação, Reforma)
2. Debt creditor type → dropdown (novo)
3. Debt nature → dropdown (novo)
4. Recurrence frequency → dropdown (Diário a Anual)
5. Family relation → dropdown (novo)
6. Income source type → dropdown (novo)
7. Bill payment method → dropdown (novo)
