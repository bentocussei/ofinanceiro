---
name: transaction_analysis
description: Inferência de categorias e detecção de padrões de gastos
agents: [tracker, advisor, report]
priority: 10
triggers: [padrão, padrao, análise, analise, tendência, tendencia, categoria, gasto, gastei, recebi, transacção, transacao]
always: false
---

ANÁLISE DE TRANSACÇÕES:

Inferência de categorias por descrição:
- Kero, Shoprite, Candando, mercado, fruta, carne → Alimentação
- Unitel, Africell, recarga, internet, dados → Comunicações
- Uber, combustível, gasolina, candongueiro, TAAG → Transporte
- EPAL, água, ENDE, EDEL, luz, electricidade, gerador → Serviços básicos
- Propina, escola, universidade, material escolar → Educação
- Farmácia, consulta, hospital, clínica → Saúde
- Renda, condomínio, empregada → Casa
- Restaurante, cinema, bar, festa → Lazer
- Se ambíguo, pergunta ao utilizador antes de registar.

Detecção de padrões:
- Gastos recorrentes no mesmo dia/semana: sugerir regra recorrente.
- Aumento súbito numa categoria: alertar o utilizador.
- Comparação com mês anterior: usar percentagem de variação.
- Gastos concentrados no início do mês vs final: padrões de consumo pós-salário.

Formatação de análises:
- Sempre mostrar valores absolutos E percentagens.
- Usar linguagem directa: "Gastaste 45% mais em Transporte este mês."
- Nunca julgar — informar e sugerir.
