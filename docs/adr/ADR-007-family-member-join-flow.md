# ADR-007: Fluxo de Integração de Membros Familiares

**Data:** 2026-03-30
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

Quando um utilizador quer juntar-se a uma família usando o código de convite, não deve ser integrado automaticamente por razões de segurança e controlo.

## Decisão

### Fluxo de Join por Código
1. Utilizador insere código → cria **pedido pendente** (não membro imediato)
2. Admins da família recebem notificação
3. Admin aprova ou recusa o pedido
4. Se aprovado → `FamilyMember` criado + notificação ao requerente

### Criação Directa
Admin pode criar membros directamente (cria User + FamilyMember numa operação). Para membros que não têm conta na app (filhos, empregados, etc.).

### Código de Convite
- Renovável pelo admin (`POST /regenerate-code`)
- Unicidade verificada antes de guardar
- Um código por família (não por pessoa)

## Alternativas Consideradas

1. **Join instantâneo** — sem controlo, qualquer pessoa com código entra
2. **Convite por email/SMS** — requer serviço externo, mais complexo
3. **QR code** — bom para mobile, mas não funciona bem em web

## Consequências

- Tab "Pedidos de integração" na página de membros
- Notificações automáticas para admins e requerentes
- ContextSwitcher mostra "Aguarde aprovação" em vez de mudar contexto
