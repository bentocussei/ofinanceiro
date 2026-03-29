---
description: Protocolo obrigatório de validação E2E para cada feature. Uma feature só está COMPLETA quando passa TODAS as fases deste protocolo. Activar ao terminar implementação de qualquer feature de qualquer módulo.
globs: ["**"]
---

# Feature Validation Protocol — O Financeiro

Protocolo obrigatório para validar qualquer feature implementada.
Uma feature só é COMPLETA quando passa TODOS os passos deste protocolo.

**Regra**: Nunca avançar para a próxima feature sem a actual estar 100% validada.

## Quando activar

- Ao terminar a implementação backend + frontend de uma feature
- Ao corrigir bugs encontrados durante validação
- Quando o utilizador pede para validar uma feature ou módulo

## Documentos de referência

- `docs/02_MODULOS_FUNCIONALIDADES.md` — especificação de cada módulo e feature
- `docs/03_ARQUITECTURA_TECNICA.md` — arquitectura e padrões técnicos
- `docs/04_ARQUITECTURA_IA.md` — para features relacionadas com IA
- `docs/05_MODELO_DADOS.md` — modelo de dados e relações
- `docs/06_UI_UX.md` — padrões de design e UX
- `docs/07_ROADMAP.md` — fase actual e dependências

---

## Protocolo em 7 Fases

### Fase 1: Especificação

Antes de testar, ler e entender exactamente o que a feature deve fazer:

1. **Spec do módulo** — ler a secção relevante em `docs/02_MODULOS_FUNCIONALIDADES.md`
   - Que funcionalidades estão definidas?
   - Que dados deve mostrar/processar?
   - Que acções o utilizador pode tomar?

2. **Modelo de dados** — verificar em `docs/05_MODELO_DADOS.md`
   - Que tabelas e relações são necessárias?
   - Que campos são obrigatórios?

3. **Definir critérios de aceitação** — ANTES de testar, listar:
   - O que esta feature deve fazer exactamente?
   - Que estados existem (vazio, loading, erro, sucesso)?
   - Que validações devem existir?
   - Como se comporta offline? (se aplicável)

### Fase 2: Backend

Verificar que a API suporta a feature completamente:

1. **Modelos SQLAlchemy** — ler os modelos
   - Campos correctos? Tipos correctos? `mapped_column` style?
   - Relações entre entidades fazem sentido?
   - Valores monetários em centavos (inteiros)?
   - UUIDs como primary keys?
   - `created_at`, `updated_at` presentes?

2. **Schemas Pydantic** — ler os schemas
   - Validações adequadas (Field com gt, le, max_length)?
   - Request e Response schemas separados?
   - `model_config = ConfigDict(from_attributes=True)`?

3. **Migrations** — verificar Alembic
   - Migration existe para as tabelas/colunas novas?
   - Indexes nos campos frequentemente consultados?

4. **Endpoints** — ler o router
   - Endpoint existe? Método HTTP correcto?
   - Autenticação (`get_current_user`) em todos?
   - Queries filtradas por `user_id`?
   - Family endpoints verificam membership + role?
   - Status codes correctos (201, 204, etc.)?
   - Rate limiting considerado?

5. **Testar com curl** — chamar cada endpoint
   ```bash
   # Login (adaptar ao auth flow)
   TOKEN="<jwt_token>"

   # Testar endpoints
   curl -s http://localhost:8000/api/v1/<resource> \
     -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

   # Testar criação
   curl -s -X POST http://localhost:8000/api/v1/<resource> \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 500000, "description": "Teste"}' | python3 -m json.tool
   ```

6. **Verificar dados reais** — os dados retornados fazem sentido?
   - Não são hardcoded/mock?
   - Valores monetários em centavos?
   - Relações carregadas correctamente?
   - Categorias Angola-specific funcionam?

7. **Testes pytest** — executar e verificar
   ```bash
   cd apps/api && pytest tests/test_<module>.py -v --tb=short
   ```
   - Happy path coberto?
   - Pelo menos um caso de erro coberto?
   - Autenticação testada (request sem token → 401)?
   - Isolamento de dados (user A não vê dados de user B)?

### Fase 3: Frontend — Código

Ler o código frontend da feature (mobile + web):

1. **Componentes** — ler os ficheiros principais
   - Chamam os endpoints correctos via React Query?
   - Tratam erros (error states, retry)?
   - Mostram loading states (Skeleton)?
   - Optimistic updates nas mutations?

2. **Offline** (mobile) — se aplicável
   - Dados cacheados em MMKV?
   - Mutations enfileiradas quando offline?
   - Sync quando volta online?

3. **UX Rules** — verificar conformidade
   - Zero UUIDs expostos ao utilizador?
   - Texto todo em Português (pt-AO)?
   - Terminologia Angola correcta (renda, telemóvel, candongueiro)?
   - Valores monetários formatados: "150.000 Kz"?
   - Números em fonte monospaced (JetBrains Mono), right-aligned?
   - Categorias Angola-specific visíveis e funcionais?

4. **Acessibilidade** (web)
   - Navegação por teclado funciona?
   - Labels nos inputs?
   - Focus states visíveis?

### Fase 4: Frontend — Design

Avaliar a qualidade visual e UX:

1. **Quem é o utilizador?** — Angolano(a) a gerir finanças pessoais/familiares
2. **O que deve fazer?** — A acção concreta desta feature
3. **Como deve sentir-se?** — Simples, claro, sem confusão

Verificar:
- **Hierarquia visual** — o mais importante está em destaque?
- **Consistência** — cores, espaçamento, tipografia coerentes com resto da app?
- **Estados interactivos** — hover, focus, disabled, loading, error visíveis?
- **Mobile-first** — funciona bem no tamanho mobile? (prioridade)
- **Cores semânticas** — verde = receita, vermelho = despesa, azul = poupança, amarelo = aviso?
- **Dark mode** — funciona em ambos os temas?
- **Regra dos 5 segundos** — a acção comum é completável em <5s?

Se houver problemas de design → **corrigir ANTES de marcar como completa**.

### Fase 5: Integração Frontend ↔ Backend

Verificar que frontend e backend funcionam juntos:

1. **Dados ao abrir** — o ecrã carrega dados reais da API?
2. **CRUD completo** — criar → ver na lista → editar → eliminar funciona?
3. **Validação** — erros da API aparecem correctamente no frontend?
4. **Actualização** — após criar/editar, a lista actualiza sem refresh manual?
5. **Paginação** — cursor-based funciona? Scroll infinito carrega mais?
6. **Filtros** — filtros por data, categoria, conta funcionam?
7. **Família** (se aplicável) — privacidade respeitada? Dados partilhados correctos?

### Fase 6: Testes E2E (Playwright)

Testar TUDO como um utilizador angolano faria:

1. **Happy path completo** — fluxo normal do início ao fim
2. **Cada campo** — preencher, limpar, valores inválidos, valores limite
3. **Cada botão** — clicar, verificar resultado
4. **Estados vazios** — o que aparece sem dados? Mensagem útil em pt-AO?
5. **Estados de erro** — o que acontece quando API falha? Mensagem clara?
6. **Validação** — campos obrigatórios, formatos, limites monetários
7. **Navegação** — links, voltar atrás, tabs
8. **Ciclo completo** — criar → visualizar → editar → eliminar
9. **Valores monetários** — formatação correcta em todos os estados

#### Script padrão Playwright (Web):
```python
from playwright.sync_api import sync_playwright
import os

SCREENSHOTS = os.path.join(os.path.dirname(__file__), "../../.claude/screenshots")
os.makedirs(SCREENSHOTS, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        viewport={"width": 1440, "height": 900},
        device_scale_factor=2
    )

    # Login
    page.goto("http://localhost:3000/login", wait_until="networkidle", timeout=15000)
    # ... auth flow (phone + OTP) ...
    page.wait_for_timeout(2000)

    # Navegar para feature
    page.goto("http://localhost:3000/<route>", wait_until="networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/<module>-<feature>-initial.png")

    # Testar happy path
    # ... interacções ...
    page.screenshot(path=f"{SCREENSHOTS}/<module>-<feature>-result.png")

    # Testar estado vazio
    # ... limpar dados ...
    page.screenshot(path=f"{SCREENSHOTS}/<module>-<feature>-empty.png")

    browser.close()
```

Tirar screenshots de CADA estado com `device_scale_factor=2` para avaliação visual.

#### Mobile (React Native / Expo)

Playwright **NÃO se aplica** ao mobile nativo. A validação E2E mobile é feita manualmente ou com ferramentas nativas:
- Testes unitários: Jest + React Native Testing Library
- Testes manuais: Expo Go ou build de desenvolvimento
- Validação visual: screenshots manuais no dispositivo/emulador

O protocolo E2E Playwright aplica-se **apenas à web (Next.js)**.

### Fase 7: Validação de Objectivo (OBRIGATÓRIA)

Não basta "botões funcionarem" e "APIs retornarem dados". CADA feature foi desenhada com um OBJECTIVO para o utilizador angolano. Verificar:

1. **Qual é o objectivo desta feature?**
   - Para que serve ao utilizador? O que espera quando a usa?

2. **O resultado cumpre o objectivo?**
   - O utilizador consegue o que precisa?
   - O fluxo completo funciona do início ao resultado final?

3. **Há gaps entre "funciona tecnicamente" e "serve o objectivo"?**

**Exemplos de gaps — NUNCA aceitar como "completa":**
- Transacção é registada mas não aparece no saldo da conta
- Orçamento é criado mas não calcula o restante automaticamente
- Meta de poupança existe mas não mostra progresso visual
- Membro da família é adicionado mas não consegue ver contas partilhadas
- Categoria é atribuída mas IA não aprende com correcções do utilizador
- Notificação está configurada mas nunca é enviada
- Despesa recorrente detectada mas utilizador não é avisado
- Relatório gerado mas sem resumo em linguagem natural
- Transacção por voz é reconhecida mas valor/categoria estão errados
- Foto de recibo processada mas dados não pré-preenchem o formulário

**Para features de IA (FIN.AI):**
- O agente correcto é seleccionado pelo Router?
- A resposta é em pt-AO com terminologia angolana?
- Tools são chamados correctamente (add_transaction, get_balance, etc.)?
- Memória é actualizada (session, facts, semantic)?
- Resposta é útil e contextualizada ao utilizador?

---

## Checklist Final

Antes de marcar uma feature como COMPLETA, responder com **evidência** (não "acho que sim"):

- [ ] Backend retorna dados reais (não mocks)?
- [ ] Testes pytest passam (happy path + erro)?
- [ ] Frontend mostra dados correctamente?
- [ ] Zero UUIDs visíveis ao utilizador?
- [ ] Texto todo em Português (pt-AO) com terminologia angolana?
- [ ] Valores monetários formatados: "X.XXX Kz"?
- [ ] Todos os estados funcionam (vazio, loading, erro, sucesso)?
- [ ] Validações impedem dados inválidos?
- [ ] Design consistente com resto da app?
- [ ] Mobile-first (funciona em viewport mobile)?
- [ ] Ciclo CRUD completo funciona?
- [ ] Testes E2E Playwright passam (web)?
- [ ] Screenshots de cada estado capturados (web)?
- [ ] Mobile: testes unitários passam (Jest)?
- [ ] **A feature cumpre o OBJECTIVO para que foi desenhada?**
- [ ] **O fluxo completo funciona do início ao resultado final?**
- [ ] **Não há gaps entre "funciona tecnicamente" e "serve ao utilizador"?**

**Se QUALQUER resposta for "não" → corrigir e re-testar. Não marcar. Não avançar.**

---

## Regras Absolutas

1. **Nunca marcar COMPLETA com problemas conhecidos** — corrigir primeiro.
2. **Nunca avançar para próxima feature** sem a actual estar 100%.
3. **Testar verticalmente profundo** (cada campo, cada estado) **e horizontalmente extenso** (cada variação, cada fluxo).
4. **Se falta algo para a feature funcionar, implementar AGORA.** Não criar listas de "melhorias futuras". Uma feature incompleta não é feature.
5. **COMPLETA = objectivo cumprido, não "CRUD funciona".** Botões que respondem e APIs que retornam dados não é completo — é estrutura. Completo é: o utilizador usa a feature, obtém o resultado que precisa, e o fluxo funciona sem gaps.
6. **Screenshots são obrigatórios.** Cada estado validado deve ter screenshot em `.claude/screenshots/`.

## Ferramentas por Fase

| Fase | Ferramentas |
|------|------------|
| Especificação | Read (docs/) |
| Backend | Read (routers, models, schemas), curl, pytest, Bash (psql) |
| Frontend código | Read (components, hooks, stores) |
| Frontend design | Avaliação visual (screenshots) |
| Integração | curl + browser |
| Testes E2E | Playwright (Python), screenshots em `.claude/screenshots/` |
| Validação objectivo | Evidência: screenshots, curl responses, test output |

## Artefactos Produzidos

Para cada feature validada:
- Screenshots em `.claude/screenshots/<module>-<feature>-<state>.png`
- Bugs encontrados e corrigidos (commit)
- Todos os testes passam (pytest + Playwright)
