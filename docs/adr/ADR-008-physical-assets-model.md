# ADR-008: Modelo de Activos Físicos (Património)

**Data:** 2026-03-30
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

O património líquido deve incluir não só dinheiro (contas, investimentos) mas também bens físicos (imóveis, veículos, terrenos). Relevante para Angola onde muita riqueza está em activos tangíveis.

## Decisão

### Modelo Asset
10 tipos: imóvel, veículo, terreno, jóias, arte, electrónicos, mobiliário, gado, participação em negócio, outro.

### Campos tipo-específicos via JSONB
```json
// Imóvel
{"address": "Talatona", "area_sqm": 120, "bedrooms": 3, "parking": 1}

// Veículo
{"brand": "Toyota", "model": "Hilux", "year": 2024, "plate": "LD-45-67-AB", "km": 25000}

// Participação em negócio
{"business_name": "Loja X", "ownership_pct": 30}
```

### Integração no Património
```
Património Líquido = Contas + Investimentos + Activos Físicos + Metas Poupança - Dívidas - Créditos
```

### Valores em BigInteger
Activos angolanos podem valer dezenas de milhões de Kz. Em centavos ultrapassa int32. Usar `BigInteger` para purchase_price, current_value, insurance_value, sold_price.

## Alternativas Consideradas

1. **Tudo como investimento** — perde campos específicos (matrícula, quartos, etc.)
2. **Tabelas separadas por tipo** — inflexível, muitos JOINs
3. **Só valor + nome** — insuficiente para tracking de depreciação

## Consequências

- Dashboard mostra 4 sub-cards: Contas, Investimentos, Bens, Dívidas
- Sidebar tem item "Património" dedicado
- Cada activo pode ter dívida associada (hipoteca, auto loan)
- Depreciação/valorização via `annual_change_rate` (basis points)
