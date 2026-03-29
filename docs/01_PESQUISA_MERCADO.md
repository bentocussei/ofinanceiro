# O Financeiro — Pesquisa de Mercado

**Versão:** 1.0
**Data:** 2026-03-28

---

## 1. Panorama Global de Apps de Finanças Pessoais

### 1.1 Líderes de Mercado (2026)

| App | Modelo | Preço | Pontos Fortes | Pontos Fracos | IA |
|---|---|---|---|---|---|
| **Monarch Money** | Subscription | $99.99/ano | Household finance, dashboards elegantes, flexibilidade de orçamento, investimentos | Sem plano gratuito, requer Plaid (EUA), sem IA conversacional profunda | Básica (AI assistant recente, categorização) |
| **YNAB** | Subscription | $109/ano | Filosofia zero-based rigorosa, comunidade forte, educação financeira | Curva de aprendizagem íngreme, sem family sharing real, rigid | Mínima (rule-based) |
| **Cleo** | Freemium | $5.99-$14.99/mês | AI-first, personalidade forte, engagement 20x superior a apps bancárias, $250M ARR | Apenas EUA/UK, sem gestão familiar, foco em Gen Z, sem multi-moeda | **Líder** (multi-agente, 40+ tools, memória, voz, proactiva) |
| **Copilot** | Subscription | $11.99/mês | Design Apple-level, categorização automática excelente | Apenas Apple (iOS/macOS), sem Android, sem família | Boa (behavioral AI, aprendizagem) |
| **Rocket Money** | Freemium | $7-$14/mês | Cancelamento de subscripções, negociação de facturas | Funcionalidades de orçamento básicas | Básica (detecção de subscripções) |
| **Empower** | Gratuito | $0 (freemium wealth mgmt) | Net worth, investimentos, retirement planning | Pushy para serviço de wealth management ($100K+ min) | Básica |
| **Origin** | Subscription | $7.50/mês | Plataforma completa (budget + invest + planning), partner access | Relativamente novo, less established | Boa (AI-powered insights) |

### 1.2 Tendências Chave (2026)

1. **IA conversacional** substituindo dashboards passivos — Cleo provou que utilizadores preferem conversar sobre dinheiro do que olhar para gráficos
2. **Consolidação** — utilizadores querem UMA app, não cinco. Budget + Invest + Planning num só lugar
3. **Household/Family** — Monarch cresceu exactamente por servir casais. O segmento família está sub-servido
4. **Privacidade** — Pós-Mint (shutdown 2024), utilizadores questionam apps gratuitas. Preferem pagar por privacidade
5. **Proactividade** — Apps que esperam perguntas perdem para apps que avisam antes do problema acontecer
6. **Voice** — Cleo 3.0 lançou voz bidireccional. Input por voz é natural para finanças ("gastei X com Y")

---

## 2. O Que Cada Concorrente Faz Bem (Para Copiar) e Mal (Para Evitar)

### 2.1 Copiar (Best Practices)

| Fonte | O Que Copiar | Como Aplicar n'O Financeiro |
|---|---|---|
| **Cleo** | Personalidade do assistente — sassy, honesta, memorável | O Financeiro terá personalidade configurável mas default "directo e honesto" |
| **Cleo** | Proactive insights — não espera perguntas | Smart Insights Engine com cron diário |
| **Cleo** | Arquitectura multi-agente com 40+ tools | Multi-agente com 10+ agentes e 20+ tools |
| **Cleo** | Memória persistente — lembra goals, stress, padrões | 3 camadas de memória (sessão, factos, semântica) |
| **Cleo** | "Roast Me" / "Hype Me" — gamificação emocional | Celebrações de marcos + alertas honestos |
| **Monarch** | Household finance — partner access grátis | Módulo Família como P1 core |
| **Monarch** | Flex budgeting vs Category budgeting | 5 métodos de orçamento |
| **Monarch** | "Needs Review" flag para parceiro | FAM-15: transacções para revisão |
| **Monarch** | Net worth tracking | RPT-08: Net Worth |
| **YNAB** | Educação financeira integrada | Módulo EDU com mini-cursos e desafios |
| **YNAB** | "Age your money" — filosofia de poupança | IA sugere estratégias de poupança |
| **Copilot** | Design Apple-level, clean e intuitivo | UI/UX como prioridade, estilo Shadcn UI clean |
| **Copilot** | Auto-categorização que aprende | Categorização IA + correcções do utilizador como feedback |
| **Rocket Money** | Detecção de subscripções | TXN-08: detecção de recorrências |

### 2.2 Evitar (Anti-Patterns)

| Fonte | O Que Evitar | Porquê |
|---|---|---|
| **YNAB** | Curva de aprendizagem excessiva | Zero-based é poderoso mas afugenta iniciantes. Oferecer como OPÇÃO, não como único método |
| **Monarch** | Sem plano gratuito | No mercado angolano, sem free tier = zero adopção. Freemium é obrigatório |
| **Cleo** | Humor excessivo / "sassy" como único tom | Funciona para Gen Z americano, pode não funcionar para angolanos 30+. Tom configurável |
| **Cleo** | Apenas EUA/UK, inglês | Nosso diferencial é exactamente servir quem eles não servem |
| **Copilot** | Apenas Apple | Android é 70%+ em Angola. Cross-platform obrigatório |
| **Empower** | Pushy upsell para wealth management | Nunca empurrar serviços que o utilizador não pediu |
| **Mint** | Modelo ad-supported (morreu em 2024) | Nunca vender dados. Subscription é o modelo correcto |

---

## 3. Mercado Angola e PALOP

### 3.1 Contexto Macro

| Indicador | Angola | Moçambique | Cabo Verde |
|---|---|---|---|
| População | ~35M | ~33M | ~600K |
| PIB per capita | ~$2.700 | ~$500 | ~$3.800 |
| Penetração smartphone | ~50% | ~30% | ~70% |
| Bancarização | ~45% | ~25% | ~65% |
| Moeda | Kwanza (AOA) | Metical (MZN) | Escudo (CVE) |
| Câmbio USD | ~912 Kz | ~64 MZN | ~101 CVE |

### 3.2 Fintechs Existentes em Angola

| Fintech | O Que Faz | Utilizadores | Concorre Connosco? |
|---|---|---|---|
| Multicaixa Express (EMIS) | Pagamentos, transferências, saldos | 1.3M+ | ❌ Pagamentos, não gestão |
| Unitel Money | Mobile money, pagamentos | 2M+ registados | ❌ Pagamentos |
| Afrimoney (Africell) | Carteira digital, pagamentos | 2M+ registados | ❌ Pagamentos |
| é-Kwanza | Mobile money, KWiK | 800K+ | ❌ Pagamentos |
| BayQi | E-commerce + pagamentos | — | ❌ E-commerce |
| CYTO | Gestão financeira empresarial | — | ❌ B2B, não pessoal |
| Apps bancárias (BAI, BFA, BIC) | Internet banking | — | ❌ Funcionalidades bancárias |

**Conclusão: ZERO concorrência directa em gestão financeira pessoal com IA em Angola.**

### 3.3 Desafios Específicos do Mercado

| Desafio | Impacto | Mitigação |
|---|---|---|
| Internet instável | Utilizadores perdem conexão frequentemente | Modo offline, sync assíncrono |
| Cash dominante | Muitas transacções em dinheiro físico, sem registo digital | Conta "Cash", registo rápido por voz |
| Mercado informal | Zungueiras, candongueiros sem recibo | Categorias pré-configuradas para informal |
| Multi-moeda real | Angolanos usam Kz E USD no dia-a-dia | Multi-moeda nativo com câmbio BNA |
| Sensibilidade a preço | $10/mês é significativo para muitos | Freemium generoso, preços acessíveis em Kz |
| Literacia financeira baixa | Conceitos como "orçamento" podem ser novos | Educação integrada, linguagem simples, onboarding guiado |
| Sem Plaid/Open Banking | Não há API para conectar automaticamente a bancos | Manual + Import extractos + OCR |
| Baixa confiança em apps | Receio de fraude e roubo de dados | Transparência, read-only, nunca move dinheiro |

### 3.4 Oportunidades Específicas

1. **Kixikila** — Poupança rotativa informal. Nenhuma app gere isso. O Financeiro pode ser o primeiro
2. **Câmbio paralelo** — Diferença entre câmbio BNA e mercado real. Tracking de ambos
3. **Gasóleo como indicador** — Preço de gasóleo afecta tudo. Monitorar e alertar
4. **Regresso às aulas** — Pico de gastos previsível. Orçamento específico
5. **13º mês** — Subsídio de férias e Natal. Planear com antecedência

---

## 4. Dimensionamento do Mercado

### 4.1 TAM/SAM/SOM

| Nível | Definição | Estimativa |
|---|---|---|
| **TAM** | Adultos com smartphone em mercados lusófonos (Angola + Moçambique + Cabo Verde + Portugal + Brasil) | ~100M pessoas |
| **SAM** | Adultos com smartphone e rendimento regular em Angola + PALOP | ~5M pessoas |
| **SOM** | Utilizadores realistas em 3 anos (Angola first) | 100.000-300.000 |

### 4.2 Revenue Potential

Com 100.000 utilizadores e 7% conversão:
- 7.000 pagantes × $4/mês (mix de planos) = **$28.000 MRR**
- **$336.000 ARR** (~306M Kz/ano)

É um negócio sustentável e escalável, mas não é um unicorn. O objectivo é independência financeira e produto de referência no mercado, não valuations de venture capital.
