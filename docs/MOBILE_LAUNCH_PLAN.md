# O Financeiro — Plano de Launch Mobile

**Objectivo**: Documentar tudo o que é necessário para lançar a app mobile nas lojas (App Store + Google Play) quando houver fundos disponíveis.

**Decisão**: Launch mobile adiado 2-3 meses. Web continua em produção como canal principal.

**Data do documento**: 2026-04-14

---

## 1. Estado Actual

### Já pronto (código + infra)
- ✅ Mobile app completa — feature parity com web
- ✅ React Native + Expo SDK 55 + New Architecture
- ✅ CRUD completo em todos os 15+ módulos
- ✅ Chat IA com gráficos, voice-to-text, file upload, OCR
- ✅ Design tokens (Warm Cream + Teal)
- ✅ Dark mode + acessibilidade
- ✅ Dois contextos (Pessoal / Familiar)
- ✅ Session reset seguro ao mudar de conta
- ✅ SpeedDial FAB
- ✅ Biometria (Face ID / Touch ID)
- ✅ EAS project configurado (`projectId: c87ef87b-ada3-4c25-a01a-4ec8014ab923`)
- ✅ Backend em produção (api.ofinanceiro.app)
- ✅ Web em produção (app.ofinanceiro.app)
- ✅ API keys configuradas (Anthropic, OpenAI, Twilio)
- ✅ File storage configurado (Cloudflare R2)
- ✅ Sentry configurado
- ✅ Cron jobs a correr

### Pendente
- ❌ Apple Developer Program ($99/ano)
- ❌ Google Play Developer ($25 one-time)
- ❌ Store listings (screenshots, descrições)
- ❌ Production builds via EAS
- ❌ QA em dispositivos reais contra produção
- ❌ Beta testing (TestFlight + Internal Testing)

---

## 2. Custos

| Item | Custo | Frequência | Quando pagar |
|------|-------|-----------|-------------|
| Apple Developer Program | **$99** | Anual | Antes do launch iOS |
| Google Play Developer | **$25** | Uma vez | Antes do launch Android |
| EAS Build (free tier) | $0 | — | Usar free tier inicialmente |
| EAS Submit (free tier) | $0 | — | Free tier suficiente |
| **Total inicial** | **$124** | — | — |

**Anthropic / OpenAI / Twilio** continuam a funcionar para web — custos variáveis já cobertos.

---

## 3. Dois caminhos possíveis

### Caminho A — Android primeiro ($25)
**Prós**: Mais barato, review mais rápido (1-3 dias), maior quota de mercado em Angola
**Contras**: iOS users sem acesso

Ordem:
1. Google Play Developer ($25)
2. EAS build Android production
3. QA + testing
4. Submeter à Play Store
5. Aprovado em ~1 semana

### Caminho B — Launch completo ($124)
**Prós**: Todos os users cobertos desde o dia 1
**Contras**: Custo inicial maior, Apple review mais rigoroso

Ordem:
1. Apple Developer ($99) + Google Play ($25)
2. EAS builds ambos
3. TestFlight (Apple) + Internal Testing (Android)
4. QA + submit
5. Aprovados em ~2 semanas

**Recomendação**: Caminho B se possível — consistência de marca entre plataformas.

---

## 4. Plano Passo-a-Passo (quando pronto)

### Semana 1 — Setup de Contas

**Apple Developer ($99)**
1. Ir a https://developer.apple.com/programs/enroll/
2. Escolher "Individual" (mais rápido que Organization, 24-48h de aprovação)
3. Confirmar identidade com passaporte/BI
4. Pagar $99
5. Aguardar email de confirmação

**Google Play Developer ($25)**
1. Ir a https://play.google.com/console/signup
2. Escolher "Personal account"
3. Pagar $25
4. Confirmar identidade (selfie + BI)
5. Normalmente aprovado em 1-2 horas

**Após aprovação:**
- Apple: criar App ID, certificates, provisioning profiles (o EAS faz automaticamente)
- Google: criar app no console, definir default language

### Semana 2 — Preparação de Material

**Screenshots obrigatórios** (ver secção 5 abaixo para specs)
- 5-8 screenshots iPhone 6.9" (iPhone Pro Max)
- 5-8 screenshots iPhone 6.1" (iPhone regular)
- 5-8 screenshots Android
- Feature graphic Android (1024×500)

**Descrições** (já com rascunho na secção 6):
- App name: "O Financeiro — Gestão Financeira"
- Subtitle iOS (30 char): "Controle as suas finanças"
- Short description Android (80 char)
- Full description iOS/Android (4000 char)
- Keywords

**App Store Connect — App Privacy**
Declarar que recolhemos:
- **Nome** (para personalização)
- **Número de telefone** (autenticação)
- **Email** (opcional, para recuperação)
- **Dados financeiros** (transacções — para funcionamento core da app)
- **Diagnósticos/Crashes** (Sentry, opcional para os users)

Declarar que NÃO recolhemos:
- Localização
- Histórico de navegação fora da app
- Contactos
- Fotos (excepto quando o user escolhe enviar recibo para OCR)

**Google Play — Data Safety**
Mesma informação adaptada ao formato Google.

### Semana 3 — Build + QA

**EAS Production Build**
```bash
cd apps/mobile

# Atualizar version/buildNumber no app.json
# "version": "1.0.0"
# "buildNumber": "1" (iOS)
# "versionCode": 1 (Android)

# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

**Credenciais iOS**:
- EAS vai pedir o Apple ID
- Cria certificate + provisioning profile automaticamente
- Build vai para a conta App Store Connect

**Credenciais Android**:
- EAS gera keystore automaticamente (guardar backup!)
- AAB gerado pronto para Play Store

**QA contra produção**:
- Login OTP real (Twilio)
- Registar transacções
- Chat com IA completo (Anthropic + OpenAI)
- Voice-to-text
- OCR com foto real
- Push notifications (requer build iOS production)
- Biometria
- Modo offline → online sync
- Trocar de conta (session reset)

**Beta testing**:
```bash
# iOS — submeter ao TestFlight
eas submit --profile production --platform ios

# Android — Internal Testing
eas submit --profile production --platform android --track internal
```

Convidar 5-10 beta testers via email.

### Semana 4 — Submissão + Aprovação

**App Store Review** (após 2-3 dias de TestFlight)
1. App Store Connect → preparar versão 1.0
2. Adicionar screenshots, descrição, categoria, age rating
3. App Privacy completo
4. Submit for Review
5. Review demora 1-7 dias (média 24-48h)
6. Possível rejeição na primeira vez — rever guidelines

**Google Play Review**
1. Play Console → criar release
2. Upload AAB
3. Store listing completo + Data Safety
4. Content rating (IARC questionnaire)
5. Submit for production
6. Review 1-3 dias

**Launch**
- Soft launch inicialmente (50-100 users convidados)
- Monitorizar Sentry + logs durante 48h
- Se estável, abrir a público

---

## 5. Screenshots — Specs Obrigatórias

### iPhone
| Size | Resolução | Devices |
|------|-----------|---------|
| **6.9"** (obrigatório) | 1320×2868 | iPhone 16 Pro Max, 15 Pro Max, 14 Pro Max |
| **6.1"** (obrigatório) | 1290×2796 | iPhone 16 Pro, 15 Pro, 14 Pro |
| 6.5" (opcional) | 1242×2688 | iPhone 11 Pro Max, XS Max |
| 5.5" (opcional) | 1242×2208 | iPhone 8 Plus |

### iPad (opcional, só se quiseres "Universal")
| Size | Resolução |
|------|-----------|
| 12.9" | 2048×2732 |
| 11" | 1668×2388 |

### Android
| Tipo | Resolução | Obrigatório |
|------|-----------|-------------|
| Phone | 1080×1920 a 3840×2160 | Sim (min 2, max 8) |
| Tablet 7" | 1024×600 | Opcional |
| Tablet 10" | 1280×800 | Opcional |
| Feature Graphic | 1024×500 | Sim |
| Icon | 512×512 | Sim |

### Screenshots recomendados (por ordem)
1. **Dashboard** — Hero com saldo + breakdown de património
2. **Chat com IA** — Conversa com gráficos e métricas
3. **Transacções** — Lista com filtros
4. **Orçamentos** — Progress bars coloridas
5. **Relatórios** — Gráfico pie de categorias
6. **Metas** — Progresso para poupança
7. **Família** — Contexto partilhado
8. **Scan recibo** — OCR com câmara

---

## 6. Descrições (rascunhos)

### App Name (30 char)
**O Financeiro** (sugestão: "O Financeiro — IA")

### Subtitle iOS (30 char)
**"Controle as suas finanças"**

### Short Description Android (80 char)
**"Gestão financeira pessoal e familiar para Angola com assistente IA."**

### Promotional Text iOS (170 char, actualizável sem review)
**"A app de gestão financeira feita para Angola. Controle gastos, planeie orçamentos, e pergunte ao assistente IA — tudo em português."**

### Full Description (PT-AO)

```
O Financeiro é a app de gestão financeira pessoal e familiar feita para Angola e PALOP.

GESTÃO COMPLETA DAS FINANÇAS
• Registe transacções em segundos — despesas, receitas e transferências
• Multi-moeda: Kwanza, USD, EUR com taxas do BNA actualizadas
• Suporta economia em dinheiro — contas próprias de dinheiro físico
• 60+ categorias configuradas para Angola (zungueira, candongueiro, Kixikila, propina, empregada doméstica, etc.)

ASSISTENTE INTELIGENTE
• Converse naturalmente: "quanto gastei este mês?" ou "crie um orçamento"
• Digitalize recibos com a câmara — os dados são extraídos automaticamente
• Fale com o assistente em vez de escrever
• Receba análises e conselhos personalizados

ORÇAMENTOS E METAS
• Orçamentos por categoria ou método (50/30/20, envelopes, zero-base)
• Metas de poupança com contribuição automática
• Notificações quando perto do limite

FAMÍLIA
• Gestão partilhada entre membros da família
• Orçamento doméstico conjunto
• Divisão automática de despesas
• Controle de gastos dos dependentes

DÍVIDAS E INVESTIMENTOS
• Acompanhe dívidas com cálculo de juros
• Simulador de amortização
• Portfolio de investimentos com análise de diversificação
• Sugestões baseadas no seu perfil de risco

FUNCIONA SEM INTERNET
• Registe transacções offline
• Sincronização automática quando volta a ter rede

SEGURANÇA
• Autenticação biométrica (Face ID / impressão digital)
• Encriptação de ponta a ponta
• Os seus dados nunca são vendidos ou partilhados

Download grátis. Subscrição Premium com funcionalidades avançadas.
```

### Keywords iOS (100 char total, comma-separated, sem espaços depois das vírgulas)
```
financas,orçamento,despesas,poupança,dinheiro,kwanza,angola,familia,dividas,metas
```

### Category
- **Primary**: Finance
- **Secondary**: Productivity

### Age Rating
- **4+** (sem conteúdo sensível)

---

## 7. Privacy Policy + Terms

Ambos devem estar publicados e acessíveis via URL antes da submissão. Estes URLs serão pedidos em:
- App Store Connect → App Privacy Policy URL
- Google Play → Privacy Policy URL

**URLs sugeridos**:
- `https://ofinanceiro.app/privacy`
- `https://ofinanceiro.app/terms`

**Conteúdo mínimo obrigatório** (contactar advogado especializado PALOP antes do launch):
1. Que dados recolhemos
2. Como usamos os dados
3. Com quem partilhamos (Anthropic, OpenAI, Twilio, Stripe)
4. Direitos do utilizador (aceder, corrigir, apagar)
5. Retenção de dados
6. Contacto (support@ofinanceiro.app)
7. Jurisdição aplicável (Angola)
8. Data de última actualização

---

## 8. TestFlight + Beta Testing

### Beta Testers sugeridos (5-10 pessoas)
- Amigos próximos com iPhones + Androids
- Early adopters da waitlist (se existir)
- Família (casos de uso real de contexto familiar)
- 1-2 contabilistas / pessoas com muitas transacções (stress test)

### Template de email
```
Olá [Nome],

Estás convidado/a a testar o O Financeiro antes do launch oficial!

iOS: [link TestFlight]
Android: [link Play Internal]

Agradecia muito o teu feedback nos primeiros 3-5 dias:
1. Consegues criar conta e fazer login sem problemas?
2. As transacções são rápidas de registar?
3. O assistente IA responde bem às tuas perguntas?
4. Encontraste algum bug ou ecrã estranho?

Manda-me screenshots ou mensagem aqui: [teu contacto]

Obrigado!
Bento
```

### Métricas a acompanhar durante beta
- Crash-free sessions %
- Tempo médio até 1ª transacção registada
- Erros de login
- Erros do chat IA

---

## 9. Checklist Final Pré-Submissão

### Código
- [ ] `app.json` — version, buildNumber, versionCode actualizados
- [ ] Sem `console.log` em código de produção
- [ ] Sem URLs de localhost / IPs locais hardcoded
- [ ] EXPO_PUBLIC_API_URL aponta para api.ofinanceiro.app (produção)
- [ ] Sentry a reportar erros correctamente
- [ ] Permissões no app.json com descrições claras (iOS: camera, mic, photo library, faceID)

### Store Listings
- [ ] Nome, subtitle, descrição revistos
- [ ] Screenshots criados e adicionados
- [ ] Keywords otimizadas
- [ ] Category correcta
- [ ] Age rating apropriado
- [ ] Privacy Policy URL acessível
- [ ] Terms URL acessível
- [ ] Support URL (pode ser landing page)

### Privacy Declarations
- [ ] Apple App Privacy questionário preenchido
- [ ] Google Data Safety questionário preenchido
- [ ] Se usa analytics: declarar tracking
- [ ] Se usa IDFA: declarar (não usamos, deve ser "No")

### Testing
- [ ] Beta testers convidados e a testar
- [ ] Pelo menos 5 users reais completaram 1ª transacção
- [ ] Zero crashes no Sentry nas últimas 48h
- [ ] Login/logout/switch-account testado
- [ ] Push notifications funcionam (iOS build production)

### Legal
- [ ] Privacy Policy publicada em produção
- [ ] Terms of Service publicados em produção
- [ ] Conformidade com leis Angola (proteção de dados)

---

## 10. Pós-Launch — Próximas Iterações

Quando já estivermos live, temos lista de features planeadas (da auditoria web→mobile):

### Tier 3 — UX polish (pós-launch)
- Avatar upload no perfil (em vez de iniciais)
- Salary day no perfil
- Referral card no dashboard
- Income source description visible na lista
- Investment maturity date display

### Tier 4 — Parity menor
- Debt status badge (quitada)
- Recurring rule next occurrence
- Onboarding redirect check

### Phase 7+ (Expansão)
- Voice conversation (OpenAI Realtime API)
- Siri Shortcuts / App Actions (voz com app fechada)
- Widgets (saldo no home screen)
- Apple Watch companion
- Multi-account login (Facebook-style)

---

## 11. Quando Rever Este Documento

- **Mensalmente** enquanto estiver adiado — verificar se custos mudaram ou se Apple/Google alteraram requisitos
- **Antes de cada sprint de launch** — actualizar checklist
- **Após aprovação das contas de developer** — remover essa secção e passar à fase seguinte

---

## 12. Contactos Úteis

- **Apple Developer Support**: https://developer.apple.com/contact/
- **Google Play Support**: https://support.google.com/googleplay/android-developer
- **EAS Build Status**: https://status.expo.dev/
- **Railway Status**: https://railway.app/status

---

*Documento criado: 2026-04-14*
*Última revisão: 2026-04-14*
*Próxima revisão: 2026-05-14*
