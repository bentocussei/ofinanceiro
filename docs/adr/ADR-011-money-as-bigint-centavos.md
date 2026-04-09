# ADR-011: Valores monetarios como BIGINT em centavos

**Data:** 2026-04-08
**Estado:** Aprovado (aplicado a producao)
**Contexto:** Bug em producao — utilizador tentou registar uma divida de 500.000.000 Kz e recebeu HTTP 500.

---

## Decisao

Todas as colunas monetarias na BD usam `BIGINT` (int64) e armazenam o valor em
**centavos** (a menor unidade da moeda). Nunca usar `INTEGER` (int32), nunca usar
`FLOAT`/`DOUBLE PRECISION`, nunca usar `NUMERIC` para dinheiro.

A conversao para a unidade visivel ao utilizador (Kz com separadores de milhares)
e feita exclusivamente na camada de apresentacao.

---

## Problema

A implementacao inicial usava `Integer` (int32) para todas as colunas monetarias.
O range de int32 e -2.147.483.648 a 2.147.483.647 — em centavos, isto significa
um maximo de **~21.474.836 Kz** (~21M) por coluna.

Em producao apareceu:

```
asyncpg.exceptions.DataError: invalid input for query argument $6:
50000000000 (value out of int32 range)
```

A utilizadora Goreth Muafumba tentou registar uma divida de 500.000.000 Kz
(50.000.000.000 centavos) e a query crashou. Em Angola, valores deste tamanho
sao perfeitamente normais (creditos de habitacao, dividas comerciais, salarios
empresariais).

Tinhamos 3 problemas misturados:

1. **Capacidade insuficiente** — int32 nao chega para a escala real do mercado.
2. **Falha silenciosa em testes** — todos os testes usavam valores pequenos (~10K Kz),
   nenhum exercitava o limite superior.
3. **Drift de schema entre modelo e BD** — alguns enums e colunas estavam fora de
   sync porque a BD foi inicialmente criada via `Base.metadata.create_all` (sem
   Alembic).

---

## Alternativas consideradas

### A) `NUMERIC(20, 2)` (decimal exacto, 2 casas decimais)
**Prós:** padrao canonico em livros de contabilidade, sem possibilidade de erro
de unidade.
**Contras:** todo o codebase ja assumia centavos como inteiros (formatadores,
calculos, agregacoes, conversoes para JSON). Migrar para `Decimal` no Python
implicaria mudancas em servicos, schemas Pydantic, frontend, e quebrar API
publica. Custo de migracao: dias. Beneficio: nenhum vs BIGINT em centavos
(ambos sao exactos).

### B) `BIGINT` em centavos (padrao Stripe / PayPal / Square)
**Prós:** mudanca minimal — so o tipo da coluna muda, todo o resto do codigo
continua igual. Operacoes sao integer arithmetic (rapido). Sem erros de
floating-point. Range vai ate ~9.2 quintilhoes de centavos — mais do que o PIB
mundial.
**Contras:** division (e.g. juros, %) tem de ser feita com cuidado para nao
perder precisao por arredondamento intermedio. Nao e um problema novo — ja era
assim com int32.

### C) Manter `INTEGER` mas validar no input layer
**Rejeitada.** So adia o problema. Utilizadores legitimos seriam bloqueados.

---

## Implementacao

Duas migrations Alembic foram criadas e aplicadas a producao:

1. `0863eb1635fe_money_columns_to_biginteger.py` — 50 colunas
2. `58cbe0aab963_remaining_money_columns_to_biginteger.py` — 4 colunas que
   tinham passado despercebidas no primeiro varrimento
   (`finance_snapshots.{net_savings, total_debt, total_savings}`,
   `debt_payments.interest`)

Total: **54 colunas** convertidas em todas as tabelas que tocam em dinheiro
(transactions, accounts, debts, debt_payments, budgets, budget_items, goals,
investments, finance_snapshots, subscriptions, invoices, etc.).

Antes de aplicar em producao:
- Backup `pg_dump` da BD de producao
- Aplicado em staging com dados realistas
- Validacao E2E com Playwright criando uma divida de 500M Kz

A migracao foi rapida (centavos de ms) porque `INTEGER → BIGINT` no Postgres
nao reescreve a tabela — apenas amplia o tipo no catalogo.

---

## Consequencias

**Positivas:**
- Resolveu o bug em producao para todos os utilizadores
- Range agora suporta valores ate ~9.2e18 centavos (sem limite pratico)
- Forcou-nos a confirmar que o caminho de schema e Alembic (e nao `create_all`)
- Estabeleceu o padrao para qualquer coluna monetaria nova

**Negativas / a vigiar:**
- Storage: cada coluna BIGINT ocupa 8 bytes vs 4 do INTEGER. Para uma tabela
  com 1M rows e 5 colunas monetarias, sao ~20MB extra. Aceitavel.
- JavaScript: numbers maiores que `Number.MAX_SAFE_INTEGER` (~9e15, ou ~90 mil
  biliones de centavos = 900 mil mil milhoes Kz) perdem precisao em JSON. Para
  o nosso dominio (financas pessoais e familiares), isto nunca e atingido. Se
  algum dia fosse, terıamos de serializar como string.

---

## Regras decorrentes

1. **Qualquer coluna nova que represente dinheiro usa `BigInteger`** (SQLAlchemy)
   ou `BIGINT` (SQL puro). Sem excepcoes.
2. **A unidade armazenada e sempre centavos** (1 Kz = 100 centavos). Nao guardamos
   Kz "inteiros" em lado nenhum.
3. **Conversao para apresentacao acontece apenas no frontend** (formatacao
   `pt-AO` com separador de milhares + sufixo `Kz`).
4. **Validacao Pydantic** dos schemas de input deve aceitar inteiros, nao floats.
5. **Calculos que envolvam divisao** (juros, percentagens) devem usar inteiros e
   so converter no fim. Ex: 10% de 1000 centavos → `1000 * 10 // 100 = 100`,
   nao `1000 * 0.1`.
6. **Nenhuma migration deve voltar a usar `Integer` para dinheiro.** Code review
   regra dura.

---

## Lessons learned

- **Tests devem incluir limites superiores realistas para o mercado.** Adicionado
  ao backlog de testes: cobrir 1M, 100M, 1B Kz em cada modelo financeiro.
- **`Base.metadata.create_all` em producao e uma bomba-relogio** — codificado
  como HARD RULE em `POST_LAUNCH_CHECKLIST.md` seccao 1, e o codigo de startup
  da API nao chama mais `create_all`.
- **Schema drift e silencioso ate explodir.** Alembic baseline + `alembic check`
  no CI sao a unica forma de prevenir.
