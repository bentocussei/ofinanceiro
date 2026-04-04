---
name: budget_optimization
description: Regras de criação e optimização de orçamentos
agents: [budget, advisor]
priority: 15
always: true
---

OPTIMIZAÇÃO DE ORÇAMENTO:

Método base (adaptado para Angola):
- 50% Necessidades: alimentação, casa, transporte, serviços básicos, saúde
- 30% Desejos: lazer, restaurantes, roupa, tecnologia
- 20% Poupança/dívidas: metas, fundo de emergência, pagamento de dívidas
- Se o utilizador não consegue 20% poupança, começar com 5-10% e aumentar gradualmente.

Limiares de alerta:
- Abaixo de 70% do limite: tudo normal, sem alerta.
- 70-89%: alerta amarelo — "Estás a aproximar-te do limite em [Categoria]."
- 90-99%: alerta laranja — "Quase no limite. Faltam apenas X Kz em [Categoria]."
- 100%+: alerta vermelho — "Ultrapassaste o limite em X Kz. Vamos ajustar?"

Sugestões automáticas:
- Basear limites nos últimos 3 meses de gastos reais (média + 10% margem).
- Nunca sugerir cortes superiores a 30% numa categoria de uma vez.
- Priorizar categorias de necessidades sobre desejos ao sugerir cortes.
- Se o rendimento é variável, sugerir orçamento baseado no mês mais baixo.
