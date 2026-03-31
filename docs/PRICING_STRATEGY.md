# O Financeiro — Estratégia de Preços

## Contexto Angola

- Salário médio: 80.000-150.000 Kz/mês
- Câmbio referência: 1 USD ≈ 830 Kz
- Apps concorrentes: inexistentes (oportunidade de mercado)
- Método de pagamento: Multicaixa Express, transferência bancária
- Sensibilidade ao preço: alta — precisa ser acessível para adopção massiva

---

## Custos por Utilizador (IA)

| Perfil | Custo IA/mês (USD) | Custo IA/mês (Kz) |
|--------|--------------------|--------------------|
| Gratuito (limitado) | ~$0.05 | ~42 Kz |
| Pessoal médio | ~$0.50 | ~415 Kz |
| Família médio | ~$1.00 | ~830 Kz |
| Power user | ~$3.00 | ~2.490 Kz |

Custos fixos por utilizador (infra Railway, DB, Redis): ~$0.02/mês

---

## Planos Propostos

### Gratuito — Aquisição massiva
| | |
|---|---|
| **Preço** | 0 Kz |
| **Objectivo** | Atrair utilizadores, criar hábito |
| **Limites** | 2 contas, 50 transacções/mês, 20 msgs chat (Haiku only), 0 OCR, 0 voz, relatórios básicos |
| **Custo IA** | ~$0.05/mês |
| **Margem** | Negativa (subsidiado — custo de aquisição) |
| **Conversão esperada** | 15-20% para plano pago em 3 meses |

### Pessoal — Core monetisation
| | |
|---|---|
| **Preço** | **1.490 Kz/mês** (~$1.80) ou 14.900 Kz/ano (2 meses grátis) |
| **Objectivo** | Utilizador individual que quer controlo total |
| **Inclui** | Contas ilimitadas, transacções ilimitadas, 200 msgs chat (Sonnet), 10 análises Opus/mês, 20 OCR recibos/mês, orçamentos avançados, relatórios completos, metas, investimentos |
| **Custo IA** | ~$0.50/mês |
| **Margem** | ~$1.30 (72%) |
| **% do salário mínimo** | ~1.9% — acessível |

### Família — Premium
| | |
|---|---|
| **Preço** | **2.990 Kz/mês** (~$3.60) ou 29.900 Kz/ano |
| **Objectivo** | Casal ou família pequena |
| **Inclui** | Tudo do Pessoal + até 6 membros, contas partilhadas, orçamento familiar, metas familiares, divisão despesas, relatórios por membro, 500 msgs chat, 50 OCR, 30 análises Opus |
| **Custo IA** | ~$1.50/mês (família usa mais) |
| **Margem** | ~$2.10 (58%) |

### Família+ — Sem limites
| | |
|---|---|
| **Preço** | **4.990 Kz/mês** (~$6.00) ou 49.900 Kz/ano |
| **Objectivo** | Famílias grandes, utilizadores intensivos |
| **Inclui** | Tudo ilimitado: membros, chat, OCR, análises Opus, voz, suporte prioritário, exportação de dados, consultoria IA premium |
| **Custo IA** | ~$3.00/mês |
| **Margem** | ~$3.00 (50%) |

---

## Projecção Financeira (18 meses)

### Pressupostos
- 80.000 downloads (meta)
- 40.000 MAU
- Distribuição: 70% free, 20% pessoal, 7% família, 3% família+

### Receita mensal no mês 18

| Plano | Utilizadores | Preço (Kz) | Receita (Kz) | Receita (USD) |
|-------|-------------|------------|--------------|---------------|
| Gratuito | 28.000 | 0 | 0 | $0 |
| Pessoal | 8.000 | 1.490 | 11.920.000 | $14.361 |
| Família | 2.800 | 2.990 | 8.372.000 | $10.086 |
| Família+ | 1.200 | 4.990 | 5.988.000 | $7.214 |
| **TOTAL** | **40.000** | | **26.280.000 Kz** | **$31.661** |

### Custos IA mensal no mês 18

| Plano | Utilizadores | Custo IA/user | Total (USD) |
|-------|-------------|---------------|-------------|
| Gratuito | 28.000 | $0.05 | $1.400 |
| Pessoal | 8.000 | $0.50 | $4.000 |
| Família | 2.800 | $1.50 | $4.200 |
| Família+ | 1.200 | $3.00 | $3.600 |
| **TOTAL** | | | **$13.200** |

### Infra (Railway, DB, Redis): ~$500/mês

### Resultado

| | Mensal (USD) | Mensal (Kz) |
|---|---|---|
| **Receita** | $31.661 | 26.280.000 |
| **Custo IA** | -$13.200 | -10.956.000 |
| **Custo infra** | -$500 | -415.000 |
| **Margem bruta** | **$17.961** | **14.909.000** |
| **Margem %** | **56.7%** | |

---

## Estratégia de Crescimento

### Fase 1 (Meses 1-6): Aquisição
- Plano gratuito generoso para criar base
- Marketing: "A app que faltava em Angola"
- Parceria com influencers financeiros angolanos
- Conteúdo educativo gratuito (Instagram, TikTok, YouTube)

### Fase 2 (Meses 7-12): Conversão
- Nudges inteligentes: "Já poupou X com O Financeiro — desbloqueie mais com Pessoal"
- Funcionalidades premium visíveis mas bloqueadas (OCR, análise Opus)
- Trial de 7 dias do plano Pessoal após 30 dias de uso gratuito
- Descontos anuais agressivos (2 meses grátis)

### Fase 3 (Meses 13-18): Retenção e Expansão
- Programa de referência: "Convide amigo → ambos ganham 1 mês grátis"
- Família como upsell natural: "A sua família também pode usar"
- Novas funcionalidades exclusivas premium (consultoria IA, previsões)
- Expansão para Moçambique, Cabo Verde

---

## Notas sobre Implementação

### Pagamento
- **Multicaixa Express** como método principal (Angola)
- **Stripe** como fallback (cartão internacional)
- Pagamento anual com desconto forte (2 meses grátis)
- Trial 7 dias sem cartão para planos pagos

### Controlo de limites
- Middleware que verifica plano + uso antes de cada chamada IA
- Contador Redis: `user:{id}:ai_calls:{month}`, `user:{id}:ocr:{month}`
- Quando atinge limite: mensagem amigável + botão upgrade
- Nunca bloquear funcionalidades core (registar transacção manual)

### Métricas a acompanhar
- **Conversion rate**: free → paid (meta: 15-20%)
- **Churn rate**: cancelamentos/mês (meta: <5%)
- **ARPU**: receita por utilizador activo (meta: $0.80+)
- **LTV**: valor vitalício do utilizador (meta: $15+)
- **CAC**: custo de aquisição (meta: <$2)

---

*Última actualização: 2026-03-31*
