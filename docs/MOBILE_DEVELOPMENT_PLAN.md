# Plano de Desenvolvimento — App Mobile

**Objectivo**: Levar a app mobile a 100% de paridade com a web + features exclusivas mobile.

**Branch**: `phase-1/mobile/full-parity`
**Base**: A app tem 27 ecrãs, 16 stores Zustand, 9 componentes. Dashboard, contas, transacções, chat, orçamentos, metas, dívidas, investimentos, contas a pagar, rendimentos, recorrentes, família, educação, notícias, notificações já existem. Falta auth, settings, contexto pessoal/família, edição em vários módulos, e features mobile-only.

### Progresso
- [x] Fase 1 — Auth (login, register, OTP, auth guard)
- [x] Fase 2 — Settings (perfil, segurança, subscrição, tags, sobre)
- [x] Fase 3 — Contexto pessoal/família (switcher, X-Context header)
- [x] Fase 4 — CRUD: update methods em 5 stores, detalhe dívidas + investimentos
- [x] Fase 5 — Ecrãs em falta (assets, referral, feedback, onboarding, scan)
- [x] Fase 6 — Push notifications, biometria, câmara/OCR, onboarding
- [x] Fase 7 — Dashboard integra referral + feedback, EmptyState component

---

## Fase 1 — Auth e Protecção de Rotas (P0)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 1.1 | Ecrã de Login (telefone + senha, tab OTP) | `app/login.tsx` |
| 1.2 | Ecrã de Registo (nome, telefone, país, promo, ?ref=) | `app/register.tsx` |
| 1.3 | Componente OTP input (6 dígitos) | `components/auth/OtpInput.tsx` |
| 1.4 | Componente PhoneInput (selector de país) | `components/auth/PhoneInput.tsx` |
| 1.5 | Auth guard no root layout (redirect para login se não autenticado) | `app/_layout.tsx` |
| 1.6 | Actualizar auth store (OTP send/verify, register com todos os campos) | `stores/auth.ts` |
| 1.7 | Splash screen com verificação de token | `app/_layout.tsx` |

**Critério de conclusão**: Utilizador não autenticado vê login, pode registar-se com OTP, pode fazer login com senha ou OTP. Token guardado em secure storage. App protegida.

---

## Fase 2 — Settings e Perfil (P0)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 2.1 | Ecrã de Definições principal | `app/settings/index.tsx` |
| 2.2 | Edição de perfil (nome, email, telefone) | `app/settings/profile.tsx` |
| 2.3 | Segurança (alterar senha) | `app/settings/security.tsx` |
| 2.4 | Subscrição (plano actual, upgrade) | `app/settings/subscription.tsx` |
| 2.5 | Tags (gestão de tags pessoais) | `app/settings/tags.tsx` |
| 2.6 | Sobre a app (versão, links) | `app/settings/about.tsx` |
| 2.7 | Store de user/profile | `stores/user.ts` |

**Critério de conclusão**: Menu "Configurações" no More abre ecrã completo. Utilizador pode editar perfil, ver subscrição, gerir tags.

---

## Fase 3 — Contexto Pessoal / Família (P0)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 3.1 | Context switcher (pessoal ↔ família) | `components/common/ContextSwitcher.tsx` |
| 3.2 | Header X-Context no API client | `lib/api.ts` |
| 3.3 | Context store (getContext, setContext, getFamilyId) | `stores/context.ts` ou `lib/context.ts` |
| 3.4 | Dashboard adapta-se ao contexto (dados pessoais vs família) | `app/(tabs)/index.tsx` |
| 3.5 | Todas as stores passam contexto nos requests | Todos os `stores/*.ts` |
| 3.6 | Navegação adapta labels (ex: "Orçamento doméstico" vs "Orçamentos") | `app/(tabs)/more.tsx` |

**Critério de conclusão**: Ao mudar contexto, todos os dados recarregam filtrados. Dashboard mostra "Património Familiar" vs "Património Pessoal".

---

## Fase 4 — Completar CRUD em Módulos Existentes (P1)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 4.1 | Transacções: ecrã de detalhe com edição | `app/transaction/[id].tsx` |
| 4.2 | Contas: ecrã de detalhe com histórico de transacções | `app/accounts/[id].tsx` |
| 4.3 | Orçamentos: detalhe completo com itens e progresso | `app/budget/[id].tsx` (melhorar) |
| 4.4 | Dívidas: detalhe com pagamentos e simulação | `app/debts/[id].tsx` |
| 4.5 | Metas: detalhe com histórico de contribuições | `app/goals/[id].tsx` (melhorar) |
| 4.6 | Investimentos: detalhe com rendimento | `app/investments/[id].tsx` |
| 4.7 | Contas a pagar: edição e marcar como pago | `app/bills/` (melhorar) |
| 4.8 | Rendimentos: edição | `app/income-sources/` (melhorar) |
| 4.9 | Recorrentes: edição | `app/recurring-rules/` (melhorar) |

**Critério de conclusão**: Todos os módulos têm create + read + update + delete completos. Tap numa transacção abre detalhe editável.

---

## Fase 5 — Ecrãs em Falta (P1)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 5.1 | Bens / Património (assets) — novo ecrã | `app/assets/index.tsx`, `app/assets/create.tsx` |
| 5.2 | Relatórios melhorados (já existe mas escondido) | `app/(tabs)/reports.tsx` (tornar visível no More) |
| 5.3 | Onboarding flow (primeiro uso após registo) | `app/onboarding.tsx` |
| 5.4 | Referral card (código, partilha, progresso) | `components/referral/ReferralCard.tsx` |
| 5.5 | Feedback (bottom sheet com 3 tabs) | `components/feedback/FeedbackSheet.tsx` |
| 5.6 | Expense splits (divisão familiar) | `app/family/expense-splits.tsx` |
| 5.7 | Membros família (gestão melhorada) | `app/family/members.tsx` |

**Critério de conclusão**: Todos os ecrãs do web existem no mobile. Menu "Mais" tem todos os itens funcionais.

---

## Fase 6 — Features Exclusivas Mobile (P2)

| # | Tarefa | Ficheiros | Dependências |
|---|--------|-----------|-------------|
| 6.1 | Push notifications (FCM/APNS) | `lib/pushNotifications.ts` | `expo-notifications` |
| 6.2 | Biometria (FaceID/TouchID/Fingerprint) | `lib/biometrics.ts` | `expo-local-authentication` |
| 6.3 | Câmara + OCR de recibos | `app/scan.tsx` | `expo-camera`, API OCR |
| 6.4 | Input por voz (Whisper) | Integração no chat | `expo-av` |
| 6.5 | Offline mode + sync queue | `lib/offlineSync.ts` | `@react-native-async-storage` |
| 6.6 | Deep linking completo (?ref=, notificações) | `app.json` scheme config | |
| 6.7 | Widget home screen (saldo rápido) | Futuro | |

**Critério de conclusão**: Push notifications funcionais, biometria no login, câmara para scan de recibos.

---

## Fase 7 — Polish e Qualidade (P2)

| # | Tarefa |
|---|--------|
| 7.1 | Animações e transições suaves em todos os ecrãs |
| 7.2 | Haptics em todas as acções de escrita |
| 7.3 | Pull-to-refresh em todas as listas |
| 7.4 | Empty states com ilustrações em todos os ecrãs |
| 7.5 | Error boundaries e error states |
| 7.6 | Acessibilidade (labels, contraste, tamanhos) |
| 7.7 | Testes E2E com Detox ou Maestro |
| 7.8 | App icons e splash screen finais |
| 7.9 | App Store / Play Store screenshots e metadata |

---

## Ordem de Implementação

```
Fase 1 (Auth)        ████████░░ — PRIORITÁRIO, app inutilizável sem isto
Fase 2 (Settings)    ████░░░░░░ — Necessário para gestão de conta
Fase 3 (Contexto)    ████████░░ — Core: isolamento pessoal/família
Fase 4 (CRUD)        ██████░░░░ — Completar o que já existe
Fase 5 (Ecrãs)       ██████░░░░ — Paridade com web
Fase 6 (Mobile-only) ████░░░░░░ — Diferenciação
Fase 7 (Polish)      ████░░░░░░ — Qualidade final
```

---

## Notas Técnicas

- **Navegação**: Expo Router (file-based), já configurado
- **State**: Zustand v5 (16 stores existentes, padrão definido)
- **UI**: Bottom sheets (@gorhom), Ionicons, dark mode nativo
- **API**: `lib/api.ts` com JWT + auto-refresh + secure storage
- **Moeda**: Centavos (inteiros), formatação `formatKz()` em `lib/format.ts`
- **Idioma**: Português (Angola) — pt-AO
