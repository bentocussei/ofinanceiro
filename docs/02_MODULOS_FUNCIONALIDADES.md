# O Financeiro — Módulos e Funcionalidades

**Versão:** 1.0
**Data:** 2026-03-28

---

## Visão Geral dos Módulos

| # | Módulo | Código | Descrição | Prioridade |
|---|---|---|---|---|
| 1 | Assistente IA | `FIN.AI` | Assistente conversacional multi-agente com memória | P0 (Core) |
| 2 | Contas e Saldos | `FIN.ACC` | Gestão de contas bancárias, carteiras e cash | P0 (Core) |
| 3 | Transacções | `FIN.TXN` | Registo, categorização e pesquisa de movimentos | P0 (Core) |
| 4 | Orçamento | `FIN.BUD` | Orçamentos pessoais e familiares com tracking | P0 (Core) |
| 5 | Família e Agregado | `FIN.FAM` | Gestão financeira familiar e doméstica | P1 (Lançamento) |
| 6 | Metas e Poupança | `FIN.GOL` | Objectivos financeiros com tracking e gamificação | P1 (Lançamento) |
| 7 | Dívidas e Créditos | `FIN.DEB` | Tracking de dívidas, empréstimos e amortização | P1 (Lançamento) |
| 8 | Relatórios e Insights | `FIN.RPT` | Dashboards, relatórios e análise inteligente | P1 (Lançamento) |
| 9 | Notificações e Alertas | `FIN.NTF` | Push notifications inteligentes e proactivas | P1 (Lançamento) |
| 10 | Investimentos | `FIN.INV` | Tracking de investimentos e simulações | P2 (Expansão) |
| 11 | Notícias Financeiras | `FIN.NEW` | Feed de notícias financeiras curado por IA | P2 (Expansão) |
| 12 | Educação Financeira | `FIN.EDU` | Conteúdo educativo, desafios e gamificação | P2 (Expansão) |
| 13 | Configurações e Perfil | `FIN.CFG` | Perfil, preferências, segurança e dados | P0 (Core) |

---

## Módulo 1: Assistente IA (`FIN.AI`)

**O coração do produto.** Não é um chatbot genérico — é um sistema multi-agente especializado em finanças pessoais que conhece o utilizador, os seus dados, e melhora com o tempo.

### 1.1 Arquitectura Multi-Agente

O assistente é composto por agentes especializados que colaboram. O **Router Agent** recebe a mensagem do utilizador e encaminha para o agente correcto.

| Agente | Responsabilidade | Exemplos de Queries |
|---|---|---|
| **Router Agent** | Classifica a intenção e encaminha para o agente correcto | (interno, não visível ao utilizador) |
| **Tracker Agent** | Registo e consulta de transacções | "Gastei 5000 Kz com almoço", "Quanto gastei em restaurantes?" |
| **Budget Agent** | Orçamentos e limites | "Cria orçamento de 80K para alimentação", "Estou dentro do orçamento?" |
| **Advisor Agent** | Conselhos e análise financeira | "Como posso gastar menos?", "Posso comprar isto?" |
| **Goals Agent** | Metas de poupança e tracking | "Quero poupar 200K até Dezembro", "Como está a minha meta?" |
| **Family Agent** | Finanças familiares | "Quanto a família gastou este mês?", "A Maria contribuiu?" |
| **Report Agent** | Geração de relatórios | "Resumo de Março", "Compara Janeiro com Fevereiro" |
| **Debt Agent** | Dívidas e empréstimos | "Quanto devo ao banco?", "Quando acabo de pagar o carro?" |
| **Investment Agent** | Investimentos e simulações | "Quanto rende 100K a 12% durante 5 anos?" |
| **News Agent** | Notícias e contexto de mercado | "O que aconteceu com o câmbio hoje?" |

### 1.2 Skills por Agente

Cada agente tem um conjunto de **skills** (instruções especializadas em Markdown) que lhe dão conhecimento de domínio e contexto.

```
skills/
├── tracker/
│   ├── categorization.md      # Regras de categorização angolana
│   ├── voice_parsing.md       # Como interpretar inputs de voz
│   └── receipt_processing.md  # Como processar fotos de recibos
├── advisor/
│   ├── spending_analysis.md   # Como analisar padrões de gasto
│   ├── savings_tips.md        # Dicas de poupança contextualizadas
│   └── angolan_context.md     # Contexto fiscal/cultural angolano
├── budget/
│   ├── budget_methods.md      # Zero-based, 50/30/20, envelopes
│   └── angola_costs.md        # Custos de referência em Angola
├── family/
│   ├── household_finance.md   # Gestão financeira doméstica
│   └── contribution_models.md # Modelos de contribuição (50/50, proporcional)
└── ...
```

### 1.3 Memória e Personalização

O assistente mantém três camadas de memória:

| Camada | O Que Armazena | Onde | Exemplos |
|---|---|---|---|
| **Memória de Sessão** | Contexto da conversa actual | Redis (TTL 24h) | "Estávamos a falar do orçamento de alimentação" |
| **Memória de Factos** | Factos aprendidos sobre o utilizador | PostgreSQL (permanente) | "Recebe salário dia 25", "Tem 2 filhos", "Paga renda de 150K" |
| **Memória Semântica** | Padrões e preferências inferidas | Embeddings (pgvector) | "Gasta mais ao fim-de-semana", "Prefere registar por voz" |

A memória é construída progressivamente:
- **Explícita** — O utilizador diz: "Recebo salário dia 25" → armazena como facto
- **Implícita** — Após 3 meses de dados, o sistema detecta: "Gastas em média 15K/semana em transporte"
- **Inferida** — O advisor detecta padrão: "Sempre que chega ao dia 20, os teus gastos aumentam — pode ser ansiedade pré-salário"

### 1.4 Function Calling (Tool Use)

O assistente executa acções reais através de function calls:

| Function | Trigger | Acção |
|---|---|---|
| `add_transaction` | "Gastei 5000 com pão" | Cria transacção: valor=5000, categoria=Alimentação, subcategoria=Supermercado |
| `get_balance` | "Quanto tenho na conta?" | Consulta saldo de todas as contas |
| `get_spending` | "Quanto gastei em restaurantes?" | Calcula total por categoria/período |
| `create_budget` | "Orçamento de 80K para alimentação" | Cria orçamento mensal |
| `check_budget` | "Estou dentro do orçamento?" | Compara gasto actual vs orçado |
| `create_goal` | "Poupar 200K até Dezembro" | Cria meta com cálculo de contribuição |
| `get_goal_progress` | "Como está a meta?" | Mostra progresso, projecção, recomendação |
| `transfer_internal` | "Move 30K para poupança" | Transferência entre contas internas |
| `generate_report` | "Resumo de Março" | Gera relatório mensal completo |
| `get_family_summary` | "Gastos da família" | Consolida gastos de todos os membros |
| `add_debt` | "Devo 500K ao BFA" | Regista dívida com termos |
| `simulate_investment` | "100K a 12% por 5 anos" | Calcula retorno composto |
| `search_transactions` | "Última vez que paguei mecânico" | Pesquisa semântica no histórico |
| `process_receipt` | [foto de recibo] | OCR multimodal → extrai valor, loja, itens |
| `import_statement` | [ficheiro PDF/CSV] | Processa extracto bancário → cria transacções |
| `get_news` | "Notícias financeiras" | Busca feed de notícias relevantes |
| `set_reminder` | "Lembra-me da renda dia 5" | Cria alerta recorrente |

### 1.5 Input Multimodal

| Input | Como Funciona | LLM Usado |
|---|---|---|
| **Texto** | Chat convencional | Claude Haiku (rápido, barato) ou Sonnet (complexo) |
| **Voz** | Speech-to-text → processamento como texto | Whisper (STT) + Claude/GPT |
| **Foto de recibo** | Multimodal — imagem enviada directamente ao LLM | GPT-4o ou Claude Sonnet (visão) |
| **Ficheiro PDF/CSV** | Extracto bancário processado e convertido em transacções | GPT-4o (PDF multimodal) ou parsing determinístico |
| **Quick actions** | Botões rápidos na UI (atalhos para acções comuns) | Não usa LLM — acção directa |

### 1.6 Proactividade (Smart Insights)

Inspirado na Cleo 3.0, o assistente não espera perguntas — gera insights proactivos:

| Insight | Trigger | Mensagem Exemplo |
|---|---|---|
| Gasto incomum | Transacção 3x acima da média da categoria | "Gastaste 45K em Uber esta semana — é 3x mais que o normal. Tudo bem?" |
| Alerta de orçamento | 80% do orçamento de uma categoria consumido | "Já usaste 80% do orçamento de restaurantes e faltam 12 dias para o mês acabar." |
| Previsão de saldo | Projecção de saldo negativo antes do próximo salário | "Ao ritmo actual, ficas com apenas 15K no dia 24. O salário entra dia 25." |
| Parabéns | Meta atingida ou streak de registo | "5 dias seguidos a registar gastos! Estás a criar um hábito excelente." |
| Factura próxima | Despesa recorrente detectada próxima do vencimento | "A renda de 150K vence em 3 dias. Tens saldo suficiente." |
| Resumo semanal | Todo domingo | "Esta semana: gastaste 85K (12K a menos que a semana passada). Top gasto: Alimentação 35K." |
| Tendência mensal | Final do mês | "Em Março gastaste 15% mais em transporte que em Fevereiro. O aumento de gasola pode explicar." |
| Oportunidade | Padrão de poupança detectado | "Nos últimos 3 meses, sempre te sobraram ~40K. Queres criar uma meta automática?" |

### 1.7 Personalidade do Assistente

O Financeiro tem personalidade configurável:

| Atributo | Default | Alternativas |
|---|---|---|
| Tom | Profissional mas acessível | Casual/amigo, Formal/executivo, Motivador/coach |
| Proactividade | Moderada (1-2 insights/dia) | Mínima, Intensa (3-5/dia) |
| Nível de detalhe | Equilibrado | Resumido, Detalhado |
| Celebrações | Activas | Desactivadas |
| Língua | Português (Angola) | Português (Portugal), Português (Brasil), English |

---

## Módulo 2: Contas e Saldos (`FIN.ACC`)

### 2.1 Tipos de Conta

| Tipo | Descrição | Ícone Sugerido |
|---|---|---|
| Conta Bancária | BAI, BFA, BIC, BMA, BNI, SOL, Keve, etc. | 🏦 |
| Carteira Digital | Multicaixa Express, é-Kwanza, Unitel Money, Afrimoney | 📱 |
| Dinheiro Físico | Cash em mãos — carteira, cofre, gaveta | 💵 |
| Poupança | Conta específica para poupança (pode ser bancária ou virtual) | 🐷 |
| Investimento | Depósito a prazo, obrigações do tesouro, etc. | 📈 |
| Cartão de Crédito | Visa/Mastercard crédito (saldo devedor) | 💳 |
| Empréstimo | Crédito habitação, automóvel, pessoal (saldo devedor negativo) | 🏠 |

### 2.2 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| ACC-01 | Criar conta | Nome, tipo, moeda, saldo inicial, ícone, cor |
| ACC-02 | Multi-moeda | Suporte Kz (default), USD, EUR. Câmbio BNA automático |
| ACC-03 | Saldo consolidado | Dashboard com total de todas as contas |
| ACC-04 | Saldo por moeda | Visão separada por Kz, USD, EUR |
| ACC-05 | Actualizar saldo manual | Botão "Actualizar saldo" com registo automático do ajuste |
| ACC-06 | Import de extracto | Upload PDF/CSV → parsing automático → criação de transacções |
| ACC-07 | OCR de extracto | Foto do extracto → multimodal → extracção de transacções |
| ACC-08 | Transferência interna | Mover dinheiro entre contas (ex: corrente → poupança) |
| ACC-09 | Histórico de saldo | Gráfico de evolução do saldo ao longo do tempo |
| ACC-10 | Conta arquivada | Arquivar contas inactivas sem perder histórico |
| ACC-11 | Ordenação e grupos | Agrupar contas (ex: "Bancos", "Carteiras Digitais", "Cash") |
| ACC-12 | Net Worth | Cálculo de património líquido: activos - passivos |

---

## Módulo 3: Transacções (`FIN.TXN`)

### 3.1 Campos de uma Transacção

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `amount` | Decimal | Sim | Valor em moeda da conta |
| `type` | Enum | Sim | `expense` / `income` / `transfer` |
| `category` | FK | Sim (auto) | Categoria principal (IA categoriza automaticamente) |
| `subcategory` | FK | Não | Subcategoria |
| `account_id` | FK | Sim | Conta associada |
| `date` | DateTime | Sim (default: agora) | Data da transacção |
| `description` | Text | Não | Descrição livre |
| `merchant` | Text | Não | Nome do estabelecimento (extraído por IA ou manual) |
| `location` | GeoJSON | Não | Localização GPS (opcional) |
| `receipt_url` | URL | Não | Foto do recibo/factura |
| `tags` | Array[Text] | Não | Tags livres: "férias", "emergência", "trabalho" |
| `is_recurring` | Boolean | Não | Se é despesa recorrente |
| `recurrence_rule` | JSONB | Não | Regra de recorrência (mensal, semanal, etc.) |
| `family_member_id` | FK | Não | Membro da família responsável |
| `needs_review` | Boolean | Não | Flag para revisão pelo parceiro/cônjuge |
| `is_private` | Boolean | Não | Esconder de membros da família |
| `notes` | Text | Não | Notas adicionais |

### 3.2 Categorias Pré-Configuradas (Contexto Angola)

```
📦 Alimentação
   ├── Supermercado (Kero, Shoprite, Maxi, Candando)
   ├── Mercado informal (zungueira, quitanda)
   ├── Restaurante
   ├── Take-away / delivery
   ├── Padaria
   └── Bebidas

🏠 Casa
   ├── Renda / Prestação habitação
   ├── Condomínio
   ├── Água (EPAL)
   ├── Electricidade (ENDE/EDEL)
   ├── Gás
   ├── Internet (Unitel, Angola Telecom, ZAP, TV Cabo)
   ├── Empregada doméstica
   ├── Manutenção / reparações
   ├── Mobiliário e decoração
   └── Produtos de limpeza

🚗 Transporte
   ├── Gasóleo / Gasolina
   ├── Candongueiro / Kupapata
   ├── Táxi / HEETCH / Kubinga
   ├── Manutenção automóvel
   ├── Seguro automóvel
   ├── Estacionamento
   ├── Lavagem automóvel
   └── Portagens

👶 Filhos
   ├── Propina escolar
   ├── Material escolar
   ├── Uniforme
   ├── Actividades extra-curriculares
   ├── Mesada
   ├── Roupa (filhos)
   ├── Saúde (filhos)
   └── Brinquedos / lazer (filhos)

💊 Saúde
   ├── Consulta médica
   ├── Medicamentos
   ├── Seguro de saúde
   ├── Laboratório / exames
   ├── Dentista
   ├── Óptica
   └── Farmácia

👔 Pessoal
   ├── Roupa e calçado
   ├── Cabeleireiro / barbeiro
   ├── Cuidados pessoais
   ├── Ginásio
   └── Outros pessoais

🎉 Lazer
   ├── Restaurantes (saída)
   ├── Cinema / teatro
   ├── Bares e discotecas
   ├── Viagens
   ├── Hobbies
   ├── Subscripcões (Netflix, Spotify, DSTV, etc.)
   └── Eventos e festas

📱 Comunicações
   ├── Telemóvel (recargas)
   ├── Internet móvel (dados)
   └── Telefone fixo

🎓 Educação
   ├── Formação / cursos
   ├── Livros
   ├── Certificações
   └── Material de estudo

💰 Transferências
   ├── Transferência para família
   ├── Ajuda financeira
   ├── Kixikila (poupança rotativa)
   └── Mesada

📋 Impostos e Governo
   ├── IRT (Imposto sobre Rendimento do Trabalho)
   ├── INSS (Segurança Social)
   ├── Multas
   ├── Documentos (BI, Passaporte)
   └── Outros impostos

🏢 Negócio (se empreendedor)
   ├── Matéria-prima
   ├── Fornecedores
   ├── Aluguer espaço
   ├── Funcionários
   ├── Marketing
   └── Equipamento

💵 Receitas
   ├── Salário
   ├── Rendimento extra
   ├── Freelance
   ├── Vendas
   ├── Rendas recebidas
   ├── Juros
   ├── Presentes recebidos
   └── Kixikila (recebimento)
```

### 3.3 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| TXN-01 | Registo rápido via chat | "Gastei 5000 com pão" → criação automática |
| TXN-02 | Registo por voz | Speech-to-text → interpretação IA → transacção |
| TXN-03 | Registo por foto | Foto de recibo → OCR multimodal → transacção com itens |
| TXN-04 | Registo manual | Formulário tradicional com campos editáveis |
| TXN-05 | Quick-add buttons | Botões na home para categorias frequentes |
| TXN-06 | Categorização automática | IA categoriza com base na descrição/merchant |
| TXN-07 | Categorização aprendida | IA melhora com o tempo baseada em correcções do utilizador |
| TXN-08 | Transacções recorrentes | Detectar e criar automaticamente (renda, luz, internet) |
| TXN-09 | Split transaction | Dividir 1 transacção em múltiplas categorias |
| TXN-10 | Pesquisa natural | "Última vez que paguei mecânico" → pesquisa semântica |
| TXN-11 | Filtros avançados | Por data, categoria, conta, valor, tags, membro da família |
| TXN-12 | Duplicação detectada | IA detecta possíveis transacções duplicadas |
| TXN-13 | Edição em lote | Recategorizar múltiplas transacções de uma vez |
| TXN-14 | Export | CSV, PDF para período seleccionado |
| TXN-15 | Needs Review | Marcar para revisão pelo parceiro/cônjuge |
| TXN-16 | Privacidade | Marcar transacção como privada (não visível à família) |
| TXN-17 | Notas e anexos | Adicionar notas e fotos a qualquer transacção |
| TXN-18 | Geolocalização | Registo automático do local (opcional, configurável) |

---

## Módulo 4: Orçamento (`FIN.BUD`)

### 4.1 Métodos de Orçamento Suportados

| Método | Descrição | Ideal Para |
|---|---|---|
| **Por Categoria** | Definir limite por cada categoria de gasto | Utilizadores que querem controlo granular |
| **50/30/20** | 50% necessidades, 30% desejos, 20% poupança | Iniciantes em orçamento |
| **Envelopes** | Alocar dinheiro por "envelope" no início do mês | Utilizadores de cash |
| **Flex** | Definir apenas o total mensal, sem categorias fixas | Utilizadores que querem simplicidade |
| **Zero-Based** | Cada kwanza tem um destino — receita menos despesas deve ser zero | Utilizadores avançados |

### 4.2 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| BUD-01 | Criar orçamento mensal | Escolher método + definir limites |
| BUD-02 | Orçamento sugerido por IA | IA analisa 3 meses anteriores e propõe orçamento |
| BUD-03 | Orçamento familiar | Orçamento partilhado entre membros do agregado |
| BUD-04 | Tracking em tempo real | Barra de progresso por categoria actualizada a cada transacção |
| BUD-05 | Alertas de limite | Notificação a 70%, 90% e 100% de cada categoria |
| BUD-06 | Rollover | Excedente ou défice transita para o mês seguinte |
| BUD-07 | Comparação mensal | Orçado vs realizado com variação |
| BUD-08 | Período configurável | Mensal (default), semanal, quinzenal, por período de salário |
| BUD-09 | Exclusões | Excluir categorias do orçamento (ex: impostos) |
| BUD-10 | Templates | Guardar orçamentos como template para reutilizar |
| BUD-11 | Via assistente | "Cria orçamento de 80K para alimentação" → criação via chat |

---

## Módulo 5: Família e Agregado (`FIN.FAM`)

### 5.1 Conceitos

| Conceito | Descrição |
|---|---|
| **Agregado** | Grupo familiar. 1 administrador + membros. Cada membro tem a sua própria conta O Financeiro. |
| **Membro** | Pessoa no agregado. Pode ser: Administrador, Adulto, Dependente (filho, menor). |
| **Conta Partilhada** | Conta que pertence ao agregado, não a um membro individual (ex: "Casa"). |
| **Conta Individual** | Conta pessoal, visível apenas ao próprio membro (privacidade). |
| **Contribuição** | Quanto cada adulto contribui para as despesas comuns (fixo, percentual, ou proporcional). |

### 5.2 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| FAM-01 | Criar agregado | Administrador cria agregado e define nome |
| FAM-02 | Convidar membros | Convite por telefone, email ou link. Cada membro instala a app e junta-se. |
| FAM-03 | Papéis | Administrador (tudo), Adulto (ver e registar), Dependente (apenas ver) |
| FAM-04 | Contas partilhadas | Criar contas do agregado: "Casa", "Férias", "Escola Filhos" |
| FAM-05 | Contas individuais | Cada membro mantém contas pessoais — privacidade respeitada |
| FAM-06 | Orçamento doméstico | Orçamento separado para despesas da casa/família |
| FAM-07 | Modelo de contribuição | Definir como cada adulto contribui: 50/50, 60/40, proporcional ao salário, fixo |
| FAM-08 | Tracking de contribuições | Quem contribuiu quanto, está em dia ou em atraso |
| FAM-09 | Gastos por filho | Ver gastos detalhados por cada filho (escola, saúde, roupa, lazer) |
| FAM-10 | Despesas domésticas | Categorias específicas: renda, condomínio, empregada, manutenção |
| FAM-11 | Eventos familiares | Orçamento para eventos: aniversários, Natal, regresso às aulas, férias |
| FAM-12 | Metas familiares | Metas partilhadas com contribuição de múltiplos membros |
| FAM-13 | Relatório familiar | Relatório mensal consolidado de todo o agregado |
| FAM-14 | Dashboard familiar | Visão consolidada: gastos totais, por membro, por categoria |
| FAM-15 | Needs Review | Marcar transacção para revisão pelo outro membro |
| FAM-16 | Transacção privada | Esconder transacção da vista familiar (ex: presente surpresa) |
| FAM-17 | Permissões granulares | Admin configura o que cada membro vê e pode fazer |
| FAM-18 | Mesada digital | Definir mesada para filhos com tracking de gastos |
| FAM-19 | Chat familiar | Canal de conversa sobre finanças dentro do agregado |
| FAM-20 | Notificações partilhadas | Alertas de orçamento familiar para todos os adultos |

---

## Módulo 6: Metas e Poupança (`FIN.GOL`)

### 6.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| GOL-01 | Criar meta | Nome, valor-alvo, prazo, ícone, cor |
| GOL-02 | Tipos de meta | Poupança, Fundo de emergência, Compra específica, Viagem, Evento |
| GOL-03 | Cálculo automático | IA calcula contribuição mensal/semanal necessária |
| GOL-04 | Progresso visual | Barra, percentagem, valor restante, data estimada de conclusão |
| GOL-05 | Contribuição manual | Adicionar dinheiro à meta manualmente |
| GOL-06 | Contribuição automática | Reservar X por mês/semana automaticamente |
| GOL-07 | Múltiplas metas | Várias metas em simultâneo com priorização |
| GOL-08 | Fundo de emergência | Meta especial: IA calcula 3-6 meses de despesas como objectivo |
| GOL-09 | Meta familiar | Meta partilhada com tracking individual de contribuição |
| GOL-10 | Recomendações | IA sugere onde cortar para acelerar meta |
| GOL-11 | Simulação | "Se reduzires restaurantes em 20K, atinges a meta 2 meses antes" |
| GOL-12 | Marcos | Celebração a 25%, 50%, 75%, 100% |
| GOL-13 | Streak | Contador de semanas/meses consecutivos com contribuição |
| GOL-14 | Ajuste automático | Se meta está em risco, IA sugere ajuste de prazo ou contribuição |
| GOL-15 | Histórico | Metas atingidas no passado (arquivo) |

---

## Módulo 7: Dívidas e Créditos (`FIN.DEB`)

### 7.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| DEB-01 | Registar dívida | Tipo, credor, valor total, taxa de juro, prestação, vencimento |
| DEB-02 | Tipos | Crédito habitação, Crédito automóvel, Crédito pessoal, Cartão de crédito, Dívida informal |
| DEB-03 | Plano de amortização | Visualizar prestações, juros, capital em dívida, data de conclusão |
| DEB-04 | Dívidas informais | "Emprestei 50K ao João" / "Devo 30K à Maria" |
| DEB-05 | Lembretes | Alerta antes do vencimento de cada prestação |
| DEB-06 | Tracking de pagamentos | Registar cada pagamento e actualizar saldo devedor |
| DEB-07 | Estratégias IA | Avalanche (juros mais altos primeiro) vs Bola de neve (dívida menor primeiro) |
| DEB-08 | Simulação de aceleração | "Se pagares mais 20K/mês, acabas 8 meses antes e poupas 150K em juros" |
| DEB-09 | Impacto no orçamento | Ver quanto das despesas mensais vai para dívidas |
| DEB-10 | Debt-free date | Data estimada em que todas as dívidas estarão pagas |
| DEB-11 | Rácio dívida/rendimento | Indicador de saúde financeira |

---

## Módulo 8: Relatórios e Insights (`FIN.RPT`)

### 8.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| RPT-01 | Dashboard Home | KPIs: saldo total, gastos do mês, receitas, poupança, metas |
| RPT-02 | Relatório mensal IA | Gerado automaticamente pelo assistente em linguagem natural |
| RPT-03 | Relatório familiar | Consolidado de todo o agregado (receitas, despesas, poupança) |
| RPT-04 | Gastos por categoria | Gráfico circular/barras com breakdown por categoria |
| RPT-05 | Tendências | Evolução mensal de gastos por categoria (gráfico de linhas) |
| RPT-06 | Comparação período | Comparar mês actual vs anterior, ou trimestres |
| RPT-07 | Cash flow | Receitas vs despesas ao longo do tempo |
| RPT-08 | Net Worth | Evolução do património líquido |
| RPT-09 | Top gastos | Ranking das maiores despesas do período |
| RPT-10 | Score financeiro | Pontuação 0-100 baseada em poupança, dívidas, orçamento, consistência |
| RPT-11 | Comparação anónima | Como te comparas com outros utilizadores da mesma faixa (opt-in) |
| RPT-12 | Export PDF | Relatório formatado para partilhar |
| RPT-13 | Partilha | Enviar relatório por WhatsApp, email ou guardar |
| RPT-14 | Estilo planilha | Vista tipo spreadsheet para quem prefere tabelas a gráficos |

---

## Módulo 9: Notificações e Alertas (`FIN.NTF`)

### 9.1 Tipos de Notificação

| Tipo | Trigger | Canal |
|---|---|---|
| Alerta de orçamento | 70%, 90%, 100% de categoria | Push + In-app |
| Factura próxima | Despesa recorrente dentro de 3 dias | Push |
| Insight proactivo | Padrão detectado pela IA | Push + Chat |
| Resumo semanal | Todo domingo | Push + Chat |
| Resumo mensal | Último dia do mês | Push + Chat + Email (opcional) |
| Meta atingida | Marco ou conclusão de meta | Push + Chat (celebração) |
| Gasto incomum | Transacção 3x acima da média | Push + Chat |
| Contribuição familiar | Membro contribuiu ou está em atraso | Push |
| Lembrete manual | Alarme criado pelo utilizador | Push |
| Streak | Dias consecutivos a registar | Push |
| Dívida vencendo | Prestação dentro de 5 dias | Push |

### 9.2 Configuração

| ID | Funcionalidade | Descrição |
|---|---|---|
| NTF-01 | Canais | Escolher: Push, In-app, Email, WhatsApp (futuro) |
| NTF-02 | Horário | Definir janela de horas para receber notificações |
| NTF-03 | Frequência | Controlar quantidade de notificações por dia |
| NTF-04 | Tipo | Activar/desactivar cada tipo individualmente |
| NTF-05 | Modo silêncio | Pausar todas as notificações temporariamente |

---

## Módulo 10: Investimentos (`FIN.INV`) — P2

### 10.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| INV-01 | Registo de investimentos | Depósitos a prazo, OTs angolanas, acções, crypto, imóveis |
| INV-02 | Tracking de rendimento | Retorno actual vs investido |
| INV-03 | Simulador | Calculadora de juros compostos com visualização |
| INV-04 | Distribuição | Gráfico de alocação por tipo de investimento |
| INV-05 | Vencimentos | Alerta quando depósito a prazo vence |
| INV-06 | Contexto angolano | Taxas de referência BNA, OTs, certificados de aforro |
| INV-07 | Impacto no Net Worth | Investimentos incluídos no cálculo de património |

---

## Módulo 11: Notícias Financeiras (`FIN.NEW`) — P2

### 11.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| NEW-01 | Feed curado | Notícias financeiras de Angola, PALOP e mundo filtradas por IA |
| NEW-02 | Fontes | Jornal de Angola, Expansão, Mercado, Ver Angola, Bloomberg, Reuters |
| NEW-03 | Relevância pessoal | IA destaca notícias que afectam as finanças do utilizador |
| NEW-04 | Câmbio | Taxa Kz/USD, Kz/EUR actualizada diariamente (BNA + mercado paralelo) |
| NEW-05 | Inflação | Índice de preços ao consumidor e impacto no poder de compra |
| NEW-06 | Resumo IA | Resumo de 3 frases de cada notícia |
| NEW-07 | Pergunta ao assistente | "O que significa esta notícia para mim?" → análise personalizada |

---

## Módulo 12: Educação Financeira (`FIN.EDU`) — P2

### 12.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| EDU-01 | Dicas diárias | IA envia dica personalizada com base no comportamento |
| EDU-02 | Desafios semanais | "Semana sem compras de impulso", "Desafio dos 52 envelopes" |
| EDU-03 | Mini-cursos | Conteúdo curto: orçamento, poupança, investimento, crédito, impostos |
| EDU-04 | Glossário | Termos financeiros em linguagem simples |
| EDU-05 | Simulações | "Se investires 50K/mês a 8% durante 5 anos, terás..." |
| EDU-06 | Gamificação | Badges, XP, níveis por completar desafios e manter hábitos |
| EDU-07 | Streaks | Dias consecutivos a registar transacções, a cumprir orçamento |
| EDU-08 | Leaderboard familiar | Ranking de membros da família por poupança ou consistência (opt-in) |

---

## Módulo 13: Configurações e Perfil (`FIN.CFG`)

### 13.1 Funcionalidades

| ID | Funcionalidade | Descrição |
|---|---|---|
| CFG-01 | Perfil | Nome, avatar, moeda principal, país |
| CFG-02 | Moeda default | Kz (Angola), USD, EUR, Metical (Moçambique), Escudo (Cabo Verde) |
| CFG-03 | Dia de início do mês | Configurável (1 ou dia do salário) |
| CFG-04 | Categorias | Criar, editar, desactivar categorias e subcategorias |
| CFG-05 | Personalidade IA | Tom, proactividade, nível de detalhe, celebrações |
| CFG-06 | Notificações | Configurar canais, horário, tipos |
| CFG-07 | Privacidade | O que é visível para membros da família |
| CFG-08 | Segurança | PIN, biometria, 2FA |
| CFG-09 | Export de dados | CSV, JSON — todos os dados do utilizador |
| CFG-10 | Eliminar conta | Eliminação permanente com período de graça de 30 dias |
| CFG-11 | Backup | Backup automático encriptado na cloud |
| CFG-12 | Idioma | Português (Angola), Português (Portugal), Português (Brasil), English |
| CFG-13 | Tema | Claro, escuro, automático (segue sistema) |
| CFG-14 | Onboarding | Setup assistido na primeira utilização |
| CFG-15 | Subscrição | Gerir plano, upgrade, downgrade, cancelamento |
| CFG-16 | Feedback | Enviar feedback, reportar bug, sugerir funcionalidade |
