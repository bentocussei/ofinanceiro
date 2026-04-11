# Estratégia de Crescimento — 90 Dias Grátis

**Objectivo:** Máximo de utilizadores activos antes do fim do trial gratuito.
**Meta mínima:** 5.000 MAU ao dia 90 → ~500 conversões pagas (10%) → ~$2.500 MRR → cobre infraestrutura.
**Meta ambiciosa:** 15.000 MAU → ~1.500 pagantes → ~$7.500 MRR → sustentável.

---

## Contexto Angola

- **35M população**, ~9M em Luanda
- **Smartphone:** ~60% penetração, Android dominante
- **Apps financeiras:** praticamente inexistentes localmente (Mint/YNAB não funcionam aqui)
- **Canais dominantes:** WhatsApp (90%+), Facebook, Instagram, TikTok
- **Economia cash:** a maioria das transacções é em dinheiro
- **Dor real:** "não sei para onde vai o meu dinheiro" é universal
- **Família:** gestão familiar é cultural — avós, tios, primos partilham despesas
- **Confiança:** angolanos confiam em recomendações de pessoas que conhecem, não em anúncios

---

## Fase 1: Semanas 1-2 — Fundação

### 1.1 Landing page optimizada para conversão

A landing page actual vende features. Precisa vender **resultados**:

**Antes:** "Gestão financeira com IA"
**Depois:** "Descobre para onde vai o teu dinheiro — em 30 segundos"

Mudanças:
- [ ] Hero com número real: "Já ajudamos X angolanos a controlar as suas finanças"
- [ ] CTA claro: "Começar grátis — 90 dias sem pagar"
- [ ] Vídeo V11 (assistente) no hero — 30s recortados mostrando "gastei 15000 no supermercado" → registado
- [ ] Depoimentos de beta testers (mesmo que sejam amigos/família iniciais)
- [ ] FAQ: "Preciso de conta bancária?" → "Não. Funciona com cash, banco, ou mobile money."
- [ ] Remover qualquer menção a "IA" no copy — vender o benefício, não a tecnologia

### 1.2 Onboarding sem fricção

O registo actual pede OTP → é bom para segurança mas cria fricção.

- [ ] Reduzir passos de onboarding para 3 máximo (telefone → OTP → criar primeira conta)
- [ ] Tour guiado já implementado (driver.js) ✓
- [ ] Primeira transacção via assistente nos primeiros 60 segundos pós-registo
- [ ] "Regista o teu primeiro gasto agora — experimenta escrever 'gastei 5000 no almoço'"
- [ ] Email/SMS de boas-vindas 1h depois com link para o vídeo do assistente

### 1.3 Instrumentação de métricas

Sem dados não sabemos o que funciona:

- [ ] PostHog ou Mixpanel free tier — eventos: registo, primeira transacção, dia 1 retorno, dia 7 retorno
- [ ] Funil: landing → registo → onboarding completo → 1ª transacção → dia 7 activo
- [ ] Cohort tracking por fonte de aquisição (WhatsApp, Facebook, directo, referral)

---

## Fase 2: Semanas 2-4 — Aquisição Orgânica

### 2.1 WhatsApp — o canal #1 em Angola

WhatsApp é o canal mais poderoso. Não comprar listas — crescer organicamente.

**Estratégia "Desafio dos 30 Dias":**

Criar um desafio: "30 Dias a Controlar o Teu Dinheiro"
- Grupo WhatsApp público (link na landing page + redes sociais)
- Dia 1: "Regista-te no O Financeiro (link). Cria a tua primeira conta."
- Dia 2: "Regista todos os gastos de hoje. Partilha o total no grupo."
- Dia 7: "Pergunta ao assistente: quanto gastei esta semana?"
- Dia 14: "Cria o teu primeiro orçamento"
- Dia 30: "Pede o teu score financeiro e partilha a tua evolução"

**Porquê funciona:**
- Pressão social (grupo) → pessoas registam gastos diariamente
- Comunidade → retenção (voltam ao grupo = voltam à app)
- Partilha natural → cada membro convida 2-3 amigos
- Custo: 0 Kz

**Meta:** 5 grupos de 256 pessoas = 1.280 utilizadores seed nas primeiras 2 semanas.

### 2.2 Conteúdo educativo (TikTok/Instagram Reels)

Criar 2-3 vídeos curtos por semana (30-60s):

| # | Tema | Hook |
|---|---|---|
| 1 | "Quanto gastas em gasolina por mês? Aposto que não sabes." | Mostra o assistente a calcular |
| 2 | "O salário entra dia 25 e dia 5 já não tens nada. Porquê?" | Mostra análise de gastos |
| 3 | "Quanto custam os teus filhos por mês? Vais levar um susto." | Mostra orçamento educação |
| 4 | "90% dos angolanos não sabem quanto têm no total." | Mostra dashboard |
| 5 | "Já tentaste poupar e nunca conseguiste? Isto muda tudo." | Mostra metas de poupança |
| 6 | "Deves dinheiro a alguém? Deixa a app controlar por ti." | Mostra gestão de dívidas |
| 7 | "Marido e mulher controlam a conta juntos — sem discussões." | Mostra contexto família |
| 8 | "Quanto gastas em zungueiras por mês? Vai-te surpreender." | Mostra categoria específica |

**Formato:** Usar os vídeos Playwright como base, recortar para 30s, adicionar voz-off e legendas em Português angolano.

**Publicar em:** TikTok, Instagram Reels, Facebook Stories, grupos de Facebook.

### 2.3 Programa de referência ("Indica um Amigo")

Implementar no app:
- [ ] Cada user tem um código de referência único
- [ ] Quem convida: ganha 30 dias extra grátis por cada amigo que se regista
- [ ] Quem é convidado: ganha 30 dias extra grátis
- [ ] Limite: máximo 12 meses grátis via referências (= 12 amigos)
- [ ] Mostrar no dashboard: "Convidaste X amigos — ganhas Y dias grátis"

**Porquê funciona:**
- Incentivo real (extensão do trial)
- Viral: cada user pode trazer 3-5 amigos
- Custo de aquisição: 0 (dás trial, não dinheiro)

### 2.4 Parcerias com influencers locais

Não gastar dinheiro em influencers grandes. Focar em **micro-influencers** (1K-10K seguidores):

- Bloggers de finanças pessoais (se existirem)
- Contabilistas/gestores que dão dicas nas redes
- Mães/pais de família com presença no Instagram
- Professores universitários de gestão/economia
- YouTubers angolanos de lifestyle

**Proposta:** "Experimenta a app grátis durante 90 dias e faz um review honesto. Se gostares, partilha com a tua audiência."

Custo: 0 (trial grátis + eventual comissão por referência).

---

## Fase 3: Semanas 4-8 — Crescimento Acelerado

### 3.1 Parcerias com empresas

Oferecer O Financeiro como **benefício corporativo**:

- Contactar RH de empresas médias em Luanda (50-500 funcionários)
- Proposta: "Os vossos funcionários pedem adiantamento todos os meses? Dêem-lhes uma ferramenta para gerir o dinheiro."
- Empresa paga plano para funcionários → aquisição em massa
- Mesmo que a empresa não pague, os funcionários podem registar-se individualmente

**Targets:**
- Empresas de tecnologia (Unitel, Africell, BAI, BFA)
- ONGs internacionais em Luanda
- Escolas/universidades (professores + alunos)
- Empresas de construção (muitos trabalhadores com salário em cash)

### 3.2 Universidades — plano estudante

- Contactar 3-5 universidades em Luanda
- Palestra/workshop: "Como gerir o teu dinheiro enquanto estudante"
- Usar O Financeiro como ferramenta prática durante o workshop
- QR code na apresentação → registo imediato
- Oferecer plano grátis permanente para estudantes (com .edu email ou cartão de estudante)

**Meta:** 500 estudantes em 4 universidades.

### 3.3 Igrejas e comunidades

Em Angola, igrejas são centros comunitários com grande influência:

- Apresentar a app como ferramenta de "boa gestão" (princípio bíblico de mordomia)
- Workshop de 30 min após o culto: "Deus deu-te dinheiro — estás a geri-lo bem?"
- QR code para download
- Funciona especialmente bem com o módulo família

### 3.4 Facebook Groups

Angola tem dezenas de grupos de Facebook com 50K-500K membros:

- "Luanda em Promoção", "Mamãs de Luanda", "Negócios Angola"
- Postar conteúdo de valor (não spam): dicas financeiras com link para a app
- "Fiz um orçamento de 500K Kz/mês. Consegui poupar 120K no primeiro mês. Usei esta app: [link]"
- Parecer testemunho real, não publicidade

---

## Fase 4: Semanas 8-12 — Retenção + Preparação para Conversão

### 4.1 Retenção — o mais importante

De nada serve ter 15K registos se ninguém usa a app ao dia 90.

**Notificações push de reengagement:**
- [ ] Dia 1: "Já registaste o teu primeiro gasto? Experimenta agora."
- [ ] Dia 3: "Sabias que já gastaste X Kz esta semana?"
- [ ] Dia 7: "Resumo semanal: gastaste X Kz. O teu top 3 categorias são..."
- [ ] Dia 14: "Cria um orçamento e descobre onde podes poupar."
- [ ] Dia 30: "Já usas há 1 mês! O teu score financeiro é X/100."
- [ ] Dia 60: "Faltam 30 dias para o fim do trial. Vê o que conseguiste até agora."
- [ ] Dia 80: "O teu trial termina em 10 dias. Os teus dados ficam seguros — podes continuar por X Kz/mês."

**Email digest semanal:**
- Resumo automático: receitas, despesas, poupança
- "A tua semana financeira em 30 segundos"
- Inclui um dado surpreendente: "Gastaste 35% mais em transporte que na semana passada"

### 4.2 Gamificação simples

- [ ] Badge "Primeira transacção"
- [ ] Badge "7 dias seguidos a registar"
- [ ] Badge "Primeiro orçamento criado"
- [ ] Badge "Meta 25% atingida"
- [ ] Badge "Score acima de 70"
- [ ] Streak: "Registaste gastos 5 dias seguidos — mantém o ritmo!"

### 4.3 Comunicação pré-conversão (dia 60-90)

**Não ser agressivo. Ser honesto:**

Dia 60 — email:
> "O teu trial termina em 30 dias. Neste período:
> - Registaste X transacções
> - Controlaste X Kz em gastos
> - O teu score financeiro passou de X para Y
>
> Para continuares com acesso completo: X Kz/mês (menos que um almoço).
> Ou: plano grátis limitado (sem assistente IA, sem família, sem relatórios)."

Dia 80 — push:
> "Faltam 10 dias. Os teus dados ficam seguros mesmo que não assines. Mas o assistente vai parar de funcionar."

Dia 89 — push:
> "Último dia do trial. Assina agora e ganha 1 mês extra grátis."

### 4.4 Plano grátis limitado (freemium)

Quando o trial acaba, NÃO bloquear tudo. Oferecer um plano free limitado:

| Feature | Grátis | Premium |
|---|---|---|
| Contas | 2 | Ilimitadas |
| Transacções/mês | 30 | Ilimitadas |
| Assistente IA | 5 perguntas/dia | Ilimitado |
| Orçamentos | 1 | Ilimitados |
| Metas | 1 | Ilimitadas |
| Família | ❌ | ✅ |
| Relatórios | Básico | Completo |
| Exportação | ❌ | ✅ |

**Porquê:** Se bloqueares tudo, o user desinstala e perdes para sempre. Se dás um free limitado, ele continua a usar e eventualmente converte quando precisa de mais.

---

## Canais por Prioridade (custo vs impacto)

| # | Canal | Custo | Impacto estimado | Quando |
|---|---|---|---|---|
| 1 | WhatsApp "Desafio 30 Dias" | 0 | Alto (1K-2K users) | Semana 1 |
| 2 | Referral "Indica um Amigo" | 0 (dev time) | Alto (viral) | Semana 2 |
| 3 | TikTok/Reels (vídeos dos demos) | 0 | Médio (500-2K) | Semana 2+ |
| 4 | Facebook Groups | 0 | Médio (500-1K) | Semana 3+ |
| 5 | Micro-influencers | 0-50K Kz/each | Médio (200-500/each) | Semana 4+ |
| 6 | Universidades workshops | 0-100K Kz (transporte) | Alto (500-1K) | Semana 5+ |
| 7 | Empresas como benefício | 0 | Alto (100-500/empresa) | Semana 6+ |
| 8 | Igrejas/comunidades | 0 | Médio (50-200/igreja) | Semana 6+ |
| 9 | Google Ads Angola | 50K-200K Kz/mês | Médio (depende) | Semana 8+ |
| 10 | Rádio local | 100K-500K Kz | Baixo-Médio | Semana 10+ |

---

## Métricas a Acompanhar Semanalmente

| Métrica | Meta Semana 4 | Meta Semana 8 | Meta Dia 90 |
|---|---|---|---|
| Registos totais | 1.000 | 5.000 | 15.000 |
| MAU (monthly active) | 500 | 3.000 | 5.000-15.000 |
| DAU (daily active) | 100 | 500 | 1.500 |
| 1ª transacção (% dos registos) | 60% | 65% | 70% |
| Dia 7 retorno | 40% | 45% | 50% |
| Dia 30 retorno | 20% | 25% | 30% |
| Referências enviadas | 100 | 1.000 | 5.000 |
| Score financeiro pedido | 50 | 500 | 2.000 |

---

## Orçamento Estimado (90 dias)

| Item | Custo |
|---|---|
| Infraestrutura (Railway) | ~$50/mês × 3 = $150 |
| LLM (Anthropic) | ~$100-300/mês × 3 = $300-900 |
| Domínio + Cloudflare | $0 (já pago) |
| Google Ads (se aplicável) | $50-200/mês = $150-600 |
| Micro-influencers (5) | $0-250 total |
| Workshops (transporte) | $50-100 |
| **Total** | **$650-2.000** |

**Break-even:** ~200 subscritores pagantes a $5/mês = $1.000 MRR → cobre tudo.

---

## Acções Imediatas (esta semana)

1. [ ] Recortar V11 (assistente) em 3 clips de 30s para redes sociais
2. [ ] Criar grupo WhatsApp "Desafio 30 Dias — O Financeiro"
3. [ ] Postar no Facebook/Instagram pessoal + 5 grupos angolanos
4. [ ] Implementar sistema de referência no app (código único + dias extra)
5. [ ] Configurar PostHog para tracking do funil
6. [ ] Preparar email de boas-vindas automático (1h pós-registo)
7. [ ] Definir preço do plano premium (sugestão: 2.500 Kz/mês ≈ $3)

---

## Preço Sugerido

| Plano | Preço/mês | Preço/ano | Target |
|---|---|---|---|
| Grátis | 0 Kz | 0 Kz | Experimentar, reter |
| Premium Individual | 2.500 Kz (~$3) | 25.000 Kz (~$30) | Utilizador activo |
| Premium Família | 4.000 Kz (~$5) | 40.000 Kz (~$48) | Casais/famílias |

**Referência:** Um almoço em Luanda custa 3.000-5.000 Kz. O Financeiro custa menos que um almoço.
**Posicionamento:** "Menos que um almoço por mês para saber exactamente para onde vai o teu dinheiro."
