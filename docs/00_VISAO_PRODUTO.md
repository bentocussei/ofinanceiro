# O Financeiro — Product Vision Document

**Versão:** 1.0
**Data:** 2026-03-28
**Classificação:** Confidencial
**Autor:** Bento Cussei

---

## 1. O Que É

O Financeiro é uma aplicação de gestão financeira pessoal e familiar com inteligência artificial generativa integrada nativamente. Disponível em mobile (iOS, Android) e web, funciona como um companheiro financeiro inteligente que conhece o utilizador, aprende com os seus dados ao longo do tempo, e fornece orientação financeira personalizada através de conversa natural.

Não é apenas uma app de tracking. É o financeiro pessoal que toda a gente merece mas ninguém tem acesso — disponível 24/7, a uma fracção do custo, e que melhora quanto mais te conhece.

---

## 2. Problema

### 2.1 Contexto Angola e PALOP

Angola tem ~35 milhões de habitantes. Mais de 50% da população é desbancarizada. As fintechs existentes (Multicaixa Express, é-Kwanza, Unitel Money, Afrimoney, BayQi) focam-se em **pagamentos** — nenhuma oferece gestão financeira pessoal.

Problemas concretos:
- Ninguém sabe exactamente para onde vai o dinheiro ao final do mês
- Famílias gerem finanças "de cabeça" sem qualquer ferramenta
- O conceito de orçamento familiar é praticamente inexistente em formato digital
- Não existe nenhuma app de finanças pessoais com IA em português para mercados africanos
- As apps internacionais (Monarch, YNAB, Cleo) não suportam Kwanza, não entendem o contexto angolano, e requerem integração bancária via Plaid (indisponível em Angola)

### 2.2 Oportunidade

- Zero concorrência directa em Angola e PALOP para gestão financeira pessoal com IA
- 300+ milhões de falantes de português sem uma app de finanças pessoais de referência
- O mercado global de apps de finanças pessoais vale $1.57B (2025) com CAGR de 14.2%
- A Cleo (AI-first finance app) atingiu $250M ARR e 6M+ utilizadores — prova de que o modelo funciona
- A Monarch Money (household finance) atingiu 30.000+ membros Reddit activos — prova de que finanças familiares são um segmento forte

---

## 3. Visão

**Tornar-se a app de referência para gestão financeira pessoal e familiar em mercados lusófonos e africanos — a primeira que combina inteligência artificial generativa nativa com compreensão profunda do contexto local.**

O Financeiro será para Angola/PALOP o que a Cleo é para EUA/UK e o Monarch é para famílias americanas — mas com vantagens estruturais:
- IA nativa desde o dia 1 (não adicionada depois)
- Gestão familiar como funcionalidade core (não add-on)
- Contexto local real (Kwanza, AGT, INSS, mercado informal, gastos com empregada doméstica)
- Funciona sem integração bancária (entrada manual + import de extractos + OCR de recibos)

---

## 4. Utilizador-Alvo

### 4.1 Persona Primária: Jovem Profissional Urbano (25-40 anos)
- Vive em Luanda, Benguela, Lubango ou capitais de PALOP
- Tem smartphone Android (70%+) ou iPhone
- Usa Multicaixa Express e/ou apps bancárias
- Recebe salário entre 100.000 Kz e 1.000.000 Kz/mês
- Sabe que devia controlar melhor as finanças mas não tem ferramenta
- Usa WhatsApp e Instagram diariamente

### 4.2 Persona Secundária: Casal/Família com Filhos
- Dois rendimentos, despesas partilhadas (renda, escola, alimentação)
- Gerem finanças conjuntas "de cabeça" ou em caderno/Excel
- Precisam de visibilidade sobre gastos comuns vs individuais
- Querem poupar para objectivos familiares (férias, carro, casa)

### 4.3 Persona Terciária: Empreendedor/Informal
- Tem rendimento variável (não salário fixo)
- Mistura finanças pessoais com finanças do negócio
- Precisa de separar o "dinheiro do negócio" do "dinheiro pessoal"
- Movimenta muito cash (dinheiro físico)

---

## 5. Proposta de Valor

**"O Financeiro sabe para onde vai o teu dinheiro — e ajuda-te a decidir para onde ele deve ir."**

| O que o utilizador quer | O que O Financeiro faz |
|---|---|
| Saber onde gastei o dinheiro | Categoriza automaticamente cada transacção com IA |
| Não perder tempo a registar gastos | Registo por voz, texto ou foto do recibo (OCR multimodal) |
| Saber se posso comprar algo | Responde em tempo real com base nos dados reais: "Sim, mas ficas com 45K até ao fim do mês" |
| Poupar para um objectivo | Cria meta, calcula contribuição mensal, acompanha progresso, celebra marcos |
| Gerir finanças da família | Contas partilhadas, orçamento doméstico, contribuições, gastos por filho |
| Entender as minhas finanças | Gera relatório mensal em linguagem simples, detecta padrões, sugere melhorias |
| Ter um consultor financeiro | Assistente IA que conhece o meu contexto, aprende com o tempo, e dá conselhos personalizados |

---

## 6. Diferenciação Competitiva

### 6.1 vs Apps Internacionais (Monarch, YNAB, Copilot, Cleo)

| Dimensão | Apps Internacionais | O Financeiro |
|---|---|---|
| Moeda | USD/EUR/GBP | Kwanza nativo + USD + EUR |
| Integração bancária | Plaid (EUA/UK/EU) | Manual + Import extractos + OCR |
| Língua | Inglês (algum ES/FR) | Português nativo (PT-AO, PT-PT, PT-BR) |
| Contexto fiscal | IRS/W-2 americano | AGT, IRT, INSS, SAFT-AO |
| Família | Add-on (Monarch) ou inexistente | Core desde o início |
| IA | Adicionada depois (excepto Cleo) | Nativa desde o dia 1 |
| Preço | $8-15/mês (~7.000-14.000 Kz) | Freemium + Premium desde ~2.000 Kz |
| Mercado informal | Não compreende | Suporta cash, gastos informais, rendimento variável |

### 6.2 vs Fintechs Angolanas (Multicaixa, é-Kwanza, Unitel Money)

Não são concorrentes — são complementares. As fintechs angolanas fazem **pagamentos**. O Financeiro faz **gestão**. O Financeiro pode importar dados dessas plataformas no futuro.

### 6.3 Moat (Vantagem Defensável)

1. **Dados acumulados por utilizador** — Quanto mais tempo usa, mais o assistente conhece o utilizador. Trocar de app significa perder meses/anos de contexto.
2. **Primeiro no mercado** — Não existe nenhuma app de finanças pessoais com IA em PALOP. Quem chegar primeiro captura o mercado.
3. **Contexto local** — Categorias angolanas (gasola, candongueiro, zungueira, empregada doméstica, propina escolar), moeda Kwanza, compliance AGT. Dificilmente replicável por uma empresa americana.
4. **Língua e tom** — O assistente fala português angolano real, não português traduzido.

---

## 7. Modelo de Negócio

### 7.1 Pricing

| Plano | Preço | Kz (estimado) | Inclui |
|---|---|---|---|
| **Gratuito** | $0 | 0 Kz | 1 conta, 50 transacções/mês, categorias básicas, assistente limitado (5 perguntas/dia) |
| **Pessoal** | $2,99/mês | ~2.700 Kz | Contas ilimitadas, transacções ilimitadas, assistente completo, metas, orçamentos, import extractos, relatórios |
| **Família** | $5,99/mês | ~5.500 Kz | Tudo do Pessoal + até 6 membros, contas partilhadas, orçamento doméstico, relatório familiar |
| **Família+** | $9,99/mês | ~9.100 Kz | Tudo do Família + membros ilimitados, insights avançados, investimentos, consultoria IA mensal |

### 7.2 Métricas-Alvo (18 meses)

| Métrica | Mês 6 | Mês 12 | Mês 18 |
|---|---|---|---|
| Downloads | 5.000 | 25.000 | 80.000 |
| MAU (Monthly Active Users) | 2.000 | 12.000 | 40.000 |
| Utilizadores pagantes | 100 | 800 | 3.000 |
| Taxa de conversão Free→Pago | 5% | 6.5% | 7.5% |
| MRR | $300 | $2.400 | $12.000 |
| MRR em Kz | ~274K | ~2.190K | ~10.950K |

---

## 8. Plataformas e Stack Técnico

| Camada | Tecnologia | Justificação |
|---|---|---|
| Web App | Next.js 15 + Tailwind CSS + Shadcn UI + Zustand | Stack moderna, SSR, componentes acessíveis |
| Mobile App | React Native + Expo | Partilha ecossistema TS/JS com web, Expo maduro em 2026 |
| Backend API | FastAPI (Python) | Ecosistema IA imbatível, experiência existente, async nativo |
| Base de Dados | PostgreSQL 16 | JSONB para flexibilidade, RLS para multi-user, extensões (pgvector) |
| Cache & Sessões | Redis | Cache de respostas IA, sessões de conversa, rate limiting |
| IA — LLM | Anthropic Claude / OpenAI GPT-4o / Google Gemini | Multi-provider, escolher melhor por tarefa (ver doc IA) |
| IA — Embeddings | text-embedding-3-small (OpenAI) ou equivalente | Para memória semântica do assistente |
| IA — Visão | GPT-4o / Claude Sonnet / Gemini Pro Vision | OCR de recibos e extractos (multimodal nativo) |
| Armazenamento | Supabase Storage ou S3-compatible | Fotos de recibos, extractos, exports |
| Auth | Supabase Auth ou Auth.js | Social login, magic link, OTP por telefone |
| Push Notifications | Expo Push + FCM/APNS | Alertas, lembretes, insights proactivos |
| Hosting | Railway / Render / Fly.io | Deploy simples, escala conforme cresce |
| Monitorização | Sentry + PostHog | Erros, analytics de produto, funnels |

---

## 9. Princípios de Design

1. **Mobile-first** — A maioria dos utilizadores angolanos acede via smartphone. A web é secundária.
2. **Offline-capable** — Angola tem internet instável. A app deve funcionar offline para registo e consulta, sincronizando quando há conexão.
3. **5-second rule** — Registar um gasto deve levar menos de 5 segundos (voz ou texto no assistente).
4. **Sem jargão** — Toda a terminologia financeira é explicada em linguagem simples. "Fluxo de caixa" → "Quanto entra e sai."
5. **Contexto angolano** — Categorias pré-configuradas para Angola (gasola, candongueiro, propina, empregada doméstica). Moeda Kwanza como default.
6. **Privacidade** — Dados financeiros são extremamente sensíveis. Encriptação, zero venda de dados, transparência total.
7. **Delightful** — A gestão financeira é tipicamente stressante. O Financeiro torna-a satisfatória com celebrações de marcos, streaks, e um assistente com personalidade.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Utilizadores não pagam (mercado angolano sensível a preço) | Alto | Alta | Freemium generoso, preço em Kz acessível, valor claro do Premium |
| Custos de IA por utilizador elevados | Alto | Média | Cache agressivo, modelos baratos para tarefas simples, quotas no plano gratuito |
| Baixa literacia digital | Médio | Média | Onboarding guiado, voz como input primário, design minimalista |
| Internet instável | Médio | Alta | Modo offline, sync assíncrono, dados locais no dispositivo |
| Cópia por player maior | Médio | Baixa (a curto prazo) | Vantagem de first-mover, dados acumulados como moat, contexto local |
| Regulação BNA sobre dados financeiros | Médio | Baixa | App é read-only (não move dinheiro), dados ficam no dispositivo/servidor seguro |

---

## 11. Métricas de Sucesso

### North Star Metric
**Número de utilizadores que registam transacções pelo menos 3 dias por semana** — mede engagement real, não downloads.

### Métricas Secundárias
- Retenção D7 / D30 / D90
- Conversão Free → Pago
- Perguntas feitas ao assistente por utilizador por semana
- Agregados familiares activos (2+ membros)
- NPS (Net Promoter Score)

---

## 12. Documentos Relacionados

| Documento | Conteúdo |
|---|---|
| `01_PESQUISA_MERCADO.md` | Análise competitiva detalhada |
| `02_MODULOS_FUNCIONALIDADES.md` | Todos os módulos e funcionalidades |
| `03_ARQUITECTURA_TECNICA.md` | Arquitectura de sistema |
| `04_ARQUITECTURA_IA.md` | Sistema multi-agente, skills, memória |
| `05_MODELO_DADOS.md` | Schema PostgreSQL completo |
| `06_UI_UX.md` | Wireframes e fluxos de utilizador |
| `07_ROADMAP.md` | Roadmap de desenvolvimento |
