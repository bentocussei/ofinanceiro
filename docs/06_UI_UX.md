# O Financeiro — UI/UX: Fluxos e Especificações de Ecrã

**Versão:** 1.0
**Data:** 2026-03-28

---

## 1. Princípios de UI/UX

### 1.1 Regras de Design

| Princípio | Implementação |
|---|---|
| **Mobile-first** | Desenhar primeiro para telemóvel, depois adaptar para web |
| **5-second rule** | Qualquer acção frequente (registar gasto) em menos de 5 segundos |
| **Thumb zone** | Acções primárias ao alcance do polegar (bottom navigation, FAB) |
| **Progressive disclosure** | Mostrar o essencial, esconder complexidade atrás de taps/swipes |
| **Data density contextual** | Dashboard = visual/gráficos. Lista de transacções = estilo planilha compacta |
| **Feedback imediato** | Toda a acção tem resposta visual instantânea |
| **Offline-aware** | Indicador claro de estado offline, operações queued |

### 1.2 Linguagem Visual

| Elemento | Especificação |
|---|---|
| **Tipografia** | Inter (UI) + JetBrains Mono (números/valores) |
| **Cores** | Neutros escuros para texto, acentos saturados para categorias, verde para positivo, vermelho para negativo |
| **Ícones** | Lucide Icons (consistente com Shadcn) |
| **Espaçamento** | Sistema de 4px (4, 8, 12, 16, 24, 32, 48) |
| **Border radius** | 8px para cards, 12px para modais, 999px para pills/tags |
| **Animações** | Subtis, 200-300ms, ease-out. Celebrações mais expressivas (confetti para metas) |
| **Números financeiros** | Sempre monospaced (JetBrains Mono), alinhados à direita, separador de milhares |
| **Formato Kz** | `150.000 Kz` (ponto para milhares, espaço antes de Kz) |

### 1.3 Padrões de Interacção

| Padrão | Onde Usar |
|---|---|
| **Bottom Sheet** | Quick-add transacção, selecção de categoria, filtros |
| **Swipe actions** | Lista de transacções (swipe left = editar, swipe right = eliminar) |
| **Pull to refresh** | Todas as listas e dashboards |
| **Long press** | Mostrar detalhes rápidos, acções de contexto |
| **FAB (Floating Action Button)** | Botão "+" para adicionar transacção (sempre visível) |
| **Tab bar** | Navegação principal (5 tabs no mobile) |
| **Segmented control** | Alternar entre vistas (semana/mês/ano, pessoal/família) |

---

## 2. Navegação Principal (Mobile)

### 2.1 Bottom Tab Bar — 5 Tabs

```
┌─────────────────────────────────────────────┐
│  🏠 Home  │  📊 Budget  │  💬 Chat  │  📈 Reports  │  👤 More  │
└─────────────────────────────────────────────┘
```

| Tab | Ecrã Principal | Conteúdo |
|---|---|---|
| 🏠 **Home** | Dashboard | Saldo, gastos do mês, últimas transacções, insights, metas |
| 📊 **Budget** | Orçamento | Orçamento activo, barras de progresso por categoria, alertas |
| 💬 **Chat** | Assistente | Conversa com O Financeiro, input de voz, quick actions |
| 📈 **Reports** | Relatórios | Gráficos, tendências, net worth, score financeiro |
| 👤 **More** | Menu | Contas, família, metas, dívidas, investimentos, configurações |

### 2.2 FAB (Floating Action Button)

Presente em todos os ecrãs (excepto Chat). Ao carregar:
- **Tap** → Bottom sheet com formulário rápido de transacção
- **Long press** → Opções: Registar gasto, Registar receita, Transferência, Foto de recibo

---

## 3. Ecrãs Detalhados

### 3.1 Home (Dashboard)

```
┌─────────────────────────────────┐
│  O Financeiro         ⚙️  🔔   │
├─────────────────────────────────┤
│                                 │
│  Saldo Total                    │
│  ┌─────────────────────────┐    │
│  │   1.250.000 Kz          │    │
│  │   ≈ $1.370 USD          │    │
│  └─────────────────────────┘    │
│                                 │
│  Março 2026                     │
│  ┌──────────┬──────────┐        │
│  │ Receitas  │ Despesas │        │
│  │ 450.000   │ 320.000  │        │
│  │ ▲ +5%     │ ▼ -8%    │        │
│  └──────────┴──────────┘        │
│                                 │
│  💡 Insight do dia              │
│  ┌─────────────────────────┐    │
│  │ "Gastaste 45K em Uber   │    │
│  │  esta semana — 3x mais  │    │
│  │  que o normal."         │    │
│  └─────────────────────────┘    │
│                                 │
│  Metas activas                  │
│  ┌─────────────────────────┐    │
│  │ 🏖️ Férias    ████░░ 65% │    │
│  │ 🚨 Emergência ██░░░ 30% │    │
│  └─────────────────────────┘    │
│                                 │
│  Últimas transacções            │
│  ┌─────────────────────────┐    │
│  │ 🍽️ Kero      -12.500 Kz│    │
│  │ 🚗 Gasóleo   -8.000 Kz │    │
│  │ 💵 Salário  +450.000 Kz│    │
│  │ 🏠 Renda    -150.000 Kz│    │
│  │           Ver todas →   │    │
│  └─────────────────────────┘    │
│                                 │
│         ┌───┐                   │
│         │ + │  FAB              │
│         └───┘                   │
├─────────────────────────────────┤
│ 🏠  📊  💬  📈  👤             │
└─────────────────────────────────┘
```

**Comportamento:**
- Saldo total: soma de todas as contas não-arquivadas. Tap → lista de contas
- Receitas/Despesas: total do mês. Percentagem vs mês anterior
- Insight: rotativo, 1 por dia. Tap → abre chat com contexto
- Metas: top 2 metas activas. Tap → detalhe da meta
- Transacções: últimas 5. Tap numa → detalhe. "Ver todas" → lista completa
- Pull down → refresh saldos

### 3.2 Chat (Assistente)

```
┌─────────────────────────────────┐
│  💬 O Financeiro                │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🤖 Olá Cussei! Como     │    │
│  │    posso ajudar?         │    │
│  └─────────────────────────┘    │
│                                 │
│         ┌───────────────────┐   │
│         │ Gastei 5000 com   │   │
│         │ almoço            │   │
│         └───────────────────┘   │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🤖 Registei:            │    │
│  │ 5.000 Kz                │    │
│  │ 📂 Alimentação > Rest.  │    │
│  │ 📅 Hoje, 13:45          │    │
│  │                         │    │
│  │ ✅ Confirmar  ✏️ Editar  │    │
│  └─────────────────────────┘    │
│                                 │
│  Quick Actions:                 │
│  ┌─────┐ ┌─────┐ ┌────────┐   │
│  │ 💰  │ │ 📊  │ │ 📸     │   │
│  │Gasto│ │Saldo│ │Recibo  │   │
│  └─────┘ └─────┘ └────────┘   │
│                                 │
│  ┌────────────────────┬──┬──┐  │
│  │ Escreve ou fala...  │🎤│📎│  │
│  └────────────────────┴──┴──┘  │
├─────────────────────────────────┤
│ 🏠  📊  💬  📈  👤             │
└─────────────────────────────────┘
```

**Comportamento:**
- Mensagens do utilizador alinhadas à direita (bolha azul)
- Mensagens do assistente alinhadas à esquerda (bolha cinza)
- Streaming de resposta (texto aparece progressivamente)
- Botões de confirmação inline (Confirmar/Editar)
- Quick Actions: atalhos para acções frequentes (expandível)
- 🎤 = Input de voz (hold to record ou tap to toggle)
- 📎 = Anexar foto (recibo) ou ficheiro (extracto)
- Suporte a Markdown básico nas respostas (bold, listas)

### 3.3 Lista de Transacções

```
┌─────────────────────────────────┐
│  ← Transacções        🔍  ⚙️   │
├─────────────────────────────────┤
│  Março 2026  ◀ ▶                │
│  ┌──────┐ ┌──────┐ ┌────────┐  │
│  │ Todas│ │Gastos│ │Receitas│  │
│  └──────┘ └──────┘ └────────┘  │
├─────────────────────────────────┤
│  HOJE — 28 Mar                  │
│  ─────────────────────────────  │
│  🍽️ Kero Viana       -12.500   │
│     Alimentação > Super  13:20  │
│  ─────────────────────────────  │
│  🚗 Pumangol TRR      -8.000   │
│     Transporte > Gasóleo 10:15  │
│  ─────────────────────────────  │
│                                 │
│  ONTEM — 27 Mar                 │
│  ─────────────────────────────  │
│  💵 NOSSA Seguros    +450.000   │
│     Receitas > Salário   00:05  │
│  ─────────────────────────────  │
│  🏠 Renda apartamento -150.000  │
│     Casa > Renda         08:30  │
│  ─────────────────────────────  │
│  👩 Empregada Maria   -25.000   │
│     Casa > Empregada     09:00  │
│  ─────────────────────────────  │
│  📱 Unitel recarga     -2.000   │
│     Comunicações         14:22  │
│  ─────────────────────────────  │
│                                 │
│         ┌───┐                   │
│         │ + │                   │
│         └───┘                   │
├─────────────────────────────────┤
│ 🏠  📊  💬  📈  👤             │
└─────────────────────────────────┘
```

**Estilo planilha** (alternativo, activável nas configurações):

```
┌────────┬──────────────────┬──────────┬───────────┐
│ Data   │ Descrição        │Categoria │ Valor     │
├────────┼──────────────────┼──────────┼───────────┤
│ 28/03  │ Kero Viana       │ 🍽️ Alim  │ -12.500  │
│ 28/03  │ Pumangol TRR     │ 🚗 Trans │  -8.000  │
│ 27/03  │ NOSSA Seguros    │ 💵 Sal   │+450.000  │
│ 27/03  │ Renda apart.     │ 🏠 Casa  │-150.000  │
│ 27/03  │ Empregada Maria  │ 🏠 Casa  │ -25.000  │
│ 27/03  │ Unitel recarga   │ 📱 Comm  │  -2.000  │
└────────┴──────────────────┴──────────┴───────────┘
```

### 3.4 Orçamento

```
┌─────────────────────────────────┐
│  📊 Orçamento     Março 2026    │
├─────────────────────────────────┤
│                                 │
│  Total: 320.000 / 400.000 Kz   │
│  ████████████████░░░░░ 80%      │
│  Restam 80.000 Kz (12 dias)    │
│                                 │
├─────────────────────────────────┤
│                                 │
│  🍽️ Alimentação                 │
│  65.000 / 80.000 Kz            │
│  █████████████░░░ 81% ⚠️        │
│                                 │
│  🏠 Casa                        │
│  175.000 / 180.000 Kz          │
│  ██████████████████░ 97% 🔴     │
│                                 │
│  🚗 Transporte                  │
│  35.000 / 50.000 Kz            │
│  ██████████░░░░░ 70%            │
│                                 │
│  🎉 Lazer                       │
│  22.000 / 40.000 Kz            │
│  ██████░░░░░░░░ 55%             │
│                                 │
│  👶 Filhos                      │
│  15.000 / 30.000 Kz            │
│  █████░░░░░░░░░ 50%             │
│                                 │
│  💊 Saúde                       │
│  8.000 / 20.000 Kz             │
│  ████░░░░░░░░░░ 40%             │
│                                 │
├─────────────────────────────────┤
│ 🏠  📊  💬  📈  👤             │
└─────────────────────────────────┘
```

**Código de cores das barras:**
- Verde (0-70%): No caminho certo
- Amarelo/⚠️ (70-90%): Atenção
- Vermelho/🔴 (90-100%): Limite próximo ou ultrapassado

### 3.5 Agregado Familiar

```
┌─────────────────────────────────┐
│  👨‍👩‍👧‍👦 Família Cussei              │
├─────────────────────────────────┤
│  ┌──────────┬──────────┐        │
│  │ Pessoal  │ Família  │        │
│  └──────────┴──────────┘        │
│                                 │
│  Gastos da casa — Março         │
│  ┌─────────────────────────┐    │
│  │ Total: 280.000 Kz       │    │
│  │                         │    │
│  │ Bento:   165.000 (59%)  │    │
│  │ ██████████░░░░░░         │    │
│  │ Ana:     115.000 (41%)  │    │
│  │ ███████░░░░░░░░░         │    │
│  └─────────────────────────┘    │
│                                 │
│  Contribuições                  │
│  ┌─────────────────────────┐    │
│  │ Modelo: 60/40            │    │
│  │ Bento: ✅ Em dia         │    │
│  │ Ana:   ⚠️ Faltam 15.000  │    │
│  └─────────────────────────┘    │
│                                 │
│  Gastos por filho               │
│  ┌─────────────────────────┐    │
│  │ 👧 Maria: 45.000 Kz     │    │
│  │   Propina: 30.000       │    │
│  │   Material: 8.000       │    │
│  │   Roupa: 7.000          │    │
│  │                         │    │
│  │ 👦 Pedro: 28.000 Kz     │    │
│  │   Propina: 20.000       │    │
│  │   Saúde: 5.000          │    │
│  │   Lazer: 3.000          │    │
│  └─────────────────────────┘    │
│                                 │
│  Meta familiar                  │
│  ┌─────────────────────────┐    │
│  │ 🏖️ Férias Cabo Ledo     │    │
│  │ 120.000 / 300.000 Kz    │    │
│  │ ████████░░░░░░░░ 40%    │    │
│  │ Bento: 80K | Ana: 40K   │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ 🏠  📊  💬  📈  👤             │
└─────────────────────────────────┘
```

---

## 4. Fluxos de Utilizador

### 4.1 Fluxo: Registar Gasto (3 caminhos)

**Caminho A — Via Chat (mais rápido)**
1. Tap no tab Chat (ou swipe para chat de qualquer ecrã)
2. Escrever: "Gastei 12500 no Kero"
3. Assistente responde com transacção pré-preenchida
4. Tap "Confirmar" ou "Editar"
5. Transacção registada, saldo actualizado

**Caminho B — Via FAB (formulário)**
1. Tap no FAB (+)
2. Bottom sheet abre com formulário:
   - Valor (teclado numérico imediato)
   - Tipo: Gasto / Receita / Transferência
   - Categoria (grid de ícones, frequentes primeiro)
   - Conta (default: principal)
   - Data (default: hoje)
   - Descrição (opcional)
3. Tap "Guardar"
4. Transacção registada

**Caminho C — Via Foto**
1. Tap no FAB (+) → "Foto de recibo"
2. Câmara abre
3. Tirar foto do recibo
4. IA processa (loading 2-3 seg)
5. Preview com dados extraídos (valor, loja, itens)
6. Confirmar ou editar
7. Transacção registada

### 4.2 Fluxo: Criar Orçamento

1. Tab Budget → "Criar Orçamento" (se nenhum existe)
2. Escolher método: Categoria / 50-30-20 / Envelopes / Flex / Zero-based
3. Se Categoria:
   a. Lista de categorias com campo de valor para cada
   b. Sugestão da IA: "Baseado nos últimos 3 meses, sugiro: Alimentação 80K, Casa 180K..."
   c. Ajustar valores
   d. Toggle rollover ON/OFF
4. Definir período (mensal default, dia de início)
5. Confirmar
6. Dashboard de orçamento activo

### 4.3 Fluxo: Convidar Membro da Família

1. More → Família → "Convidar Membro"
2. Inserir telefone ou email
3. Escolher papel: Adulto / Dependente
4. Enviar convite (SMS/email com link)
5. Membro recebe, instala app, cria conta
6. Aceita convite → junta-se ao agregado
7. Contas partilhadas e orçamento familiar ficam visíveis

### 4.4 Fluxo: Perguntar "Posso Comprar Isto?"

1. Chat: "Posso comprar uns sapatos de 25000?"
2. Assistente:
   - Consulta saldo actual
   - Consulta orçamento (categoria Pessoal)
   - Consulta despesas previstas até fim do mês (recorrências)
   - Calcula impacto
3. Resposta: "Tens 85.000 Kz disponíveis. Se comprares os sapatos (25K), ficas com 60K até dia 25 (salário). Tens renda (150K no dia 5) mas já está coberta. Podes comprar — ficas confortável."
4. Ou: "Tens 30.000 Kz e a renda de 150K vence em 3 dias. Não recomendo agora. Queres guardar como meta para o próximo mês?"

### 4.5 Fluxo: Import de Extracto Bancário

1. More → Contas → Seleccionar conta → "Importar extracto"
2. Escolher: Ficheiro (PDF/CSV) ou Foto
3. Se ficheiro: seleccionar do dispositivo
4. Loading: "A processar extracto..."
5. Preview: lista de transacções extraídas com:
   - Categorização automática por IA
   - Highlight de transacções que podem ser duplicadas
   - Checkbox para seleccionar/deseleccionar
6. Editar categorias se necessário
7. "Importar X transacções"
8. Transacções criadas, saldo actualizado

### 4.6 Fluxo: Relatório Mensal

1. No final do mês, push notification: "O teu relatório de Março está pronto!"
2. Tap → abre relatório:
   - Resumo executivo gerado por IA (2-3 parágrafos)
   - Receitas vs Despesas (gráfico de barras)
   - Breakdown por categoria (gráfico circular)
   - Top 5 maiores gastos
   - Comparação com mês anterior
   - Progresso das metas
   - Score financeiro (0-100)
   - Recomendações da IA
3. Botão "Partilhar" → PDF via WhatsApp/Email
4. Botão "Falar sobre isto" → abre chat com contexto do relatório

---

## 5. Design System — Componentes Chave

### 5.1 Card de Transacção

```
┌─────────────────────────────────────┐
│ 🍽️                        -12.500 Kz│
│ Kero Viana                          │
│ Alimentação > Supermercado   13:20  │
└─────────────────────────────────────┘
```

Variantes:
- **Default**: ícone + merchant + categoria + valor
- **Compact**: ícone + merchant + valor (sem subcategoria)
- **Expanded**: + notas, tags, recibo, membro da família
- **Review**: borda amarela tracejada, badge "Para revisão"
- **Private**: ícone de cadeado, valor escondido (tap para revelar)

### 5.2 Card de Meta

```
┌─────────────────────────────────────┐
│ 🏖️ Férias Cabo Ledo                 │
│ ████████████░░░░░░░░ 65%            │
│ 195.000 / 300.000 Kz               │
│ Faltam 105.000 Kz · Prazo: Jul 2026│
│ Contribuição: 35.000 Kz/mês        │
└─────────────────────────────────────┘
```

### 5.3 Barra de Orçamento

```
┌─────────────────────────────────────┐
│ 🍽️ Alimentação        65K / 80K Kz │
│ █████████████░░░ 81%           ⚠️   │
│ Restam 15.000 Kz (12 dias)         │
└─────────────────────────────────────┘
```

### 5.4 Card de Insight

```
┌─────────────────────────────────────┐
│ 💡                                   │
│ "Gastaste 45K em Uber esta semana   │
│  — 3x mais que o normal. Transporte │
│  público poderia poupar-te 30K."    │
│                                     │
│ 💬 Falar sobre isto     ✕ Dispensar │
└─────────────────────────────────────┘
```

---

## 6. Responsividade Web

### 6.1 Breakpoints

| Breakpoint | Layout |
|---|---|
| < 640px (mobile) | Single column, bottom nav, full-width cards |
| 640-1024px (tablet) | Two columns, sidebar nav colapsável |
| > 1024px (desktop) | Three columns: sidebar + main + detail panel |

### 6.2 Layout Desktop

```
┌──────────┬──────────────────────┬──────────────┐
│          │                      │              │
│ Sidebar  │   Conteúdo Principal │   Painel     │
│          │                      │   Lateral    │
│ 🏠 Home  │   Dashboard /        │   Chat       │
│ 📊 Budget│   Lista /            │   Assistente │
│ 📈 Reports│   Detalhes          │   (sempre    │
│ 🎯 Metas │                      │    visível)  │
│ 💳 Contas│                      │              │
│ 👨‍👩‍👧 Família│                    │              │
│ ⚙️ Config│                      │              │
│          │                      │              │
└──────────┴──────────────────────┴──────────────┘
```

Na versão web desktop, o chat do assistente está sempre visível no painel lateral direito — como um co-piloto permanente. Isto permite registar gastos enquanto se vê o dashboard, ou pedir análises enquanto se revê o orçamento.
