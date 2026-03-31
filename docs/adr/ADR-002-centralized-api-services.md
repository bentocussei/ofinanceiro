# ADR-002: API Services Centralizados no Frontend

**Data:** 2026-03-29
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

As chamadas API estavam hardcoded em 46+ ficheiros com URLs duplicadas. Mudar um endpoint exigia encontrar e corrigir em todos os sítios.

## Decisão

Criar camada de serviços centralizada em `apps/web/src/lib/api/`:
- `client.ts` — base `apiFetch` com JWT management
- 20 service files (accounts.ts, bills.ts, etc.) — funções tipadas por recurso
- `index.ts` — re-exporta tudo

Cada serviço exporta funções tipadas (`billsApi.list()`, `billsApi.create(data)`) e os tipos TypeScript associados.

## Padrão

```typescript
// Antes: URL hardcoded em cada página
await apiFetch("/api/v1/bills/", { method: "POST", body: JSON.stringify(data) })

// Depois: serviço tipado
await billsApi.create(data)
```

## Consequências

- Endpoint URL definido num único lugar
- TypeScript types co-localizados com as chamadas
- `list()` extrai `.items` para backward compat, `listPage()` retorna paginação completa
- Contexto familiar passado via `opts: { headers: getContextHeader() }`
