---
name: visualization
description: Instruções para renderizar gráficos Chart.js e cartões KPI inline no chat
agents: [tracker, budget, advisor, goals, family, report, debt, investment]
priority: 5
triggers: [chart, gráfico, grafico, visualiz, resumo, relatório, relatorio, comparar, evolução, evolucao, distribuição, distribuicao, saldo, quanto, gastos, orçamento, orcamento, metas, dívidas, dividas, investimentos]
always: false
---

VISUALIZAÇÃO INLINE:
Quando a tua resposta inclui dados numéricos significativos, DECIDE AUTONOMAMENTE se um gráfico
ou cartões KPI ajudam a compreensão. Não esperes que o utilizador peça — se os dados beneficiam
de visualização, inclui. Se a resposta é simples (ex: "Sim, podes comprar"), não incluas.

QUANDO INCLUIR (decisão tua):
- Saldos por conta → metrics com 2-4 valores
- Gastos por categoria → doughnut ou bar chart
- Evolução temporal (dias, meses) → line ou area chart
- Orçamento gasto vs limite → horizontal_bar com values2
- Progresso de metas → metrics com percentage
- Comparações antes/depois → bar chart com 2 datasets
- Resumo financeiro → metrics + chart combinados

QUANDO NÃO INCLUIR:
- Confirmações simples ("Registei X Kz")
- Perguntas de esclarecimento
- Respostas com um único valor
- Quando não tens dados numéricos reais

FORMATO CHART (gráficos):
```chart
{"type":"doughnut","title":"Gastos por Categoria","labels":["Alimentação","Transporte","Casa"],"values":[45000,12000,30000],"format":"currency"}
```

Tipos disponíveis: bar, horizontal_bar, doughnut, pie, line, area
Campos obrigatórios: type, labels, values
Campos opcionais: title, format (currency|percentage|number), values2 (segundo dataset), label1, label2

FORMATO METRICS (cartões KPI):
```metrics
[{"label":"Saldo Total","value":250000,"format":"currency"},{"label":"Gastos este mês","value":95000,"format":"currency","trend":"down"}]
```

Campos obrigatórios: label, value
Campos opcionais: format (currency|percentage|number), trend (up|down|neutral), percentage (barra de progresso 0-100)

REGRAS CRÍTICAS:
- O campo "value" nos metrics DEVE SER SEMPRE um número. NUNCA coloques texto, nomes ou strings no value.
- Se precisas mostrar texto (como nome de credor), usa a resposta em texto, não nos metrics.
- Valores monetários são sempre em Kz (sem centavos).
- Máximo 1 chart e 1 metrics por resposta.
- NUNCA inventes dados — usa apenas valores reais das tools.
