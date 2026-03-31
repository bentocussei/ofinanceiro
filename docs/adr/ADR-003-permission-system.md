# ADR-003: Sistema de Permissões Module:Feature:Action

**Data:** 2026-03-31
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

Necessidade de controlo de acesso granular para:
1. Limitar funcionalidades por plano de subscrição
2. Controlar acesso de membros familiares
3. Preparar RBAC admin para o futuro painel administrativo

## Decisão

### Formato de Permissão
`module:feature:action` — ex: `transactions:manage:create`, `ai:ocr:create`

### Ficheiro Centralizado
`app/permissions.py` — mapeia todos os módulos (20), features, e acções. Fonte única de verdade para gerar permissões na BD, validar endpoints, e configurar planos.

### Modelos DB
- `Permission` — código único com módulo/feature/acção
- `PlanPermission` — M2M plano ↔ permissões
- `UserPermission` — per-user grants/revokes com source tracking
- `AdminRole` + `AdminRolePermission` — roles admin
- `AdminUser` + `AdminUserRevokedPermission` — admin users com revogações individuais

### Três Camadas de Verificação
1. **Plan permission** (`PlanPermission`) — o plano do utilizador inclui esta funcionalidade?
2. **Family member flags** (`FinanceContext`) — o membro familiar pode fazer esta acção?
3. **Admin permission** (`AdminRolePermission`) — o admin tem esta permissão?

### Auto-sync
Quando um utilizador subscreve/upgrade, as permissões do plano são automaticamente sincronizadas para `UserPermission`.

## Alternativas Consideradas

1. **RBAC simples com roles** — insuficiente para limites por plano
2. **Feature flags** — não cobre acções granulares
3. **Hardcoded checks** — não escalável

## Consequências

- 115 permissões (93 client + 22 admin) geradas automaticamente
- Endpoints protegidos com `PlanPermission("module:feature:action")`
- Frontend usa `PermissionProvider` + `RequirePermission` guards
- Sidebar filtra items baseado em `hasModuleAccess()`
- Admin RBAC pronto para painel futuro sem alterações de código
