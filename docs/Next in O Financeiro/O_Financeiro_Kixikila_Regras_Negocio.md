# Módulo Kixikila — Regras de Negócio e Funcionalidades

**Documento:** Especificação funcional completa do módulo Kixikila Digital
**Plataforma:** O Financeiro
**Prioridade:** P0 — MVP
**Data:** Abril 2026

---

## 1. Conceito

Kixikila é o nome angolano para ROSCA (Rotating Savings and Credit Association) — um sistema de poupança colectiva rotativa usado por milhões de pessoas em Angola e em toda a África.

Um grupo de N pessoas acorda um valor fixo de contribuição e uma frequência (semanal, quinzenal, mensal). Em cada ciclo, todos contribuem o valor acordado. O total acumulado (valor × N membros) é entregue a UM membro do grupo, por rotação. O processo repete-se até todos os membros terem recebido.

Na prática: se 10 pessoas contribuem 50.000 Kz/mês, em cada mês uma pessoa recebe 500.000 Kz. Ao fim de 10 meses, todos contribuíram 500.000 Kz e todos receberam 500.000 Kz. Quem recebe nos primeiros ciclos obtém acesso antecipado a capital (equivalente funcional de crédito sem juros). Quem recebe nos últimos ciclos pratica poupança forçada.

O sistema é baseado em confiança pessoal. A principal causa de falha é: alguém que já recebeu deixa de contribuir nos ciclos seguintes. O módulo Kixikila Digital resolve este problema através de transparência, confirmação de pagamentos reais, e histórico de confiança.

---

## 2. Ciclo de Vida do Grupo

### 2.1 Estados do Grupo

```
FORMING → ACTIVE → COMPLETED
                 ↘ PAUSED → ACTIVE (retoma)
                 ↘ DISSOLVED (encerramento antecipado)
```

**FORMING** — grupo criado, a recrutar membros. Ainda não iniciou ciclos. O admin pode editar configurações livremente.

**ACTIVE** — grupo em funcionamento. Ciclos a decorrer. Configurações financeiras bloqueadas (valor, frequência). Apenas configurações operacionais editáveis (grace period, notificações).

**PAUSED** — grupo temporariamente pausado pelo admin. Nenhum ciclo a decorrer. Razões possíveis: férias colectivas, problema com membro, reestruturação. Os ciclos já completos mantêm-se. Ao retomar, continua do ciclo onde parou.

**COMPLETED** — todos os ciclos foram executados. Todos os membros receberam. Grupo arquivado automaticamente. Dados mantidos para histórico e reliability scores.

**DISSOLVED** — grupo encerrado antes de completar todos os ciclos. Pode acontecer por: decisão unânime, problemas irreconciliáveis, ou membros insuficientes. Requer acção do admin com confirmação. Os ciclos já executados mantêm-se no histórico.

### 2.2 Regras de Transição

| De | Para | Condição | Quem pode |
|---|---|---|---|
| FORMING → ACTIVE | Mínimo de `min_members` membros confirmados + admin define data de início + ordem de rotação definida | Admin |
| ACTIVE → PAUSED | Decisão do admin. Máximo de 2 pausas por grupo. Pausa máxima de 30 dias. | Admin |
| PAUSED → ACTIVE | Admin retoma. Datas dos ciclos pendentes recalculadas a partir da data de retoma. | Admin |
| ACTIVE → COMPLETED | Último ciclo executado e payout confirmado. Transição automática. | Sistema |
| ACTIVE → DISSOLVED | Admin inicia dissolução + todos os membros confirmam OU admin + treasurer concordam (se membros não respondem em 7 dias). | Admin + membros |
| FORMING → DISSOLVED | Admin cancela grupo antes de iniciar. Sem impacto financeiro. | Admin |

---

## 3. Membros

### 3.1 Papéis

**Admin (Responsável)** — criador do grupo ou membro designado. Pode: editar configurações, aprovar/remover membros, confirmar pagamentos manuais, pausar/retomar grupo, iniciar dissolução, definir/alterar ordem de rotação (apenas antes do grupo iniciar ou para ciclos futuros). Cada grupo tem exactamente 1 admin.

**Treasurer (Tesoureiro)** — opcional. Pode: confirmar pagamentos manuais, ver relatórios financeiros detalhados. Não pode alterar configurações nem remover membros. Útil para grupos maiores onde o admin delega a verificação de pagamentos.

**Member (Membro)** — participa contribuindo e recebendo. Pode: ver dashboard do grupo, ver quem pagou, fazer contribuições, ver o seu reliability score, sair do grupo (com restrições).

### 3.2 Adesão de Membros

**Convite:** o admin partilha o código de convite (ex: `KIX-7A3F`) ou link directo. O código é curto para ser facilmente partilhado via WhatsApp ou de viva voz.

**Aprovação:** se `requires_admin_approval = true` (default), o admin tem de aprovar cada novo membro. Se false, qualquer pessoa com o código entra automaticamente (uso: grupos de amigos próximos onde a confiança é total).

**Requisitos para aderir:**
- Ter conta no O Financeiro (verificada com telefone)
- Não estar banido do grupo (se foi removido anteriormente do mesmo grupo, não pode reentrar sem aprovação explícita do admin)
- O grupo deve estar em estado FORMING ou ACTIVE (para ciclos futuros)

**Entrada em grupo ACTIVE:** se um membro entra depois do grupo ter iniciado:
- Só pode ser beneficiário em ciclos futuros (nunca retroactivos)
- Começa a contribuir a partir do próximo ciclo
- A sua posição na rotação é definida pelo admin (inserido no final por default)
- O total de ciclos do grupo pode ser estendido para acomodar o novo membro (requer aprovação do admin)

### 3.3 Saída de Membros

**Saída voluntária (membro quer sair):**

- **Antes de receber:** o membro pode sair. As contribuições já feitas não são reembolsadas automaticamente — o admin decide (configurável nas regras do grupo). O ciclo do membro que saiu é eliminado da rotação. Os ciclos restantes são reajustados.
- **Depois de receber:** o membro NÃO pode sair voluntariamente até o grupo completar. Já beneficiou do pool — sair agora seria equivalente a não pagar de volta. O sistema bloqueia a saída. Se o membro insistir, o admin pode remover (ver "Remoção forçada" abaixo), mas o sistema regista como `missed_payments` para todos os ciclos restantes, afectando severamente o reliability score.

**Remoção forçada (admin remove membro):**

O admin pode remover um membro em qualquer momento. O sistema:
1. Regista a remoção com razão (campo texto)
2. Se o membro ainda não recebeu: as contribuições já feitas são registadas. O admin decide sobre reembolso.
3. Se o membro já recebeu: todas as contribuições futuras são marcadas como `missed`. O reliability score cai drasticamente.
4. O ciclo do membro removido é eliminado. A rotação é reajustada.
5. O membro removido não pode reentrar sem aprovação explícita do admin.

**Substituição:** o admin pode adicionar um novo membro para ocupar a posição do membro que saiu. O novo membro herda a posição na rotação mas não herda contribuições anteriores — começa do zero.

### 3.4 Limites

- Mínimo de membros por grupo: configurável, default 3, mínimo absoluto 2
- Máximo de membros por grupo: configurável, default 20, máximo absoluto 50
- Um utilizador pode participar em múltiplas kixikilas simultaneamente (sem limite)
- Um utilizador pode ser admin de no máximo 5 grupos activos ao mesmo tempo

---

## 4. Rotação

### 4.1 Tipos de Rotação

**Fixa (fixed)** — default. O admin define a ordem antes do grupo iniciar. A ordem é visível a todos os membros. Não muda durante a execução (excepto por remoção/adição de membros).

**Aleatória (random)** — o sistema sorteia o beneficiário de cada ciclo. O sorteio é feito no início de cada ciclo (não todo de uma vez) para que membros que ainda não receberam tenham chance igual. Membros que já receberam são excluídos do sorteio. O resultado do sorteio é registado com timestamp e visível a todos.

**Por necessidade (need_based)** — o admin (ou o grupo por votação) decide antes de cada ciclo quem recebe. Útil para situações onde alguém tem uma urgência (doença, reparação de casa, propinas). Requer que o admin defina o beneficiário antes do deadline de contribuição de cada ciclo.

**Leilão (auction)** — membros que ainda não receberam podem "licitar" oferecendo um desconto sobre o pool. Exemplo: "aceito receber 450.000 em vez de 500.000 para receber este mês." Quem oferece o maior desconto recebe. A diferença é distribuída proporcionalmente entre os contribuintes ou acumulada no pool. Implementação mais complexa — considerar para versão futura (P2).

### 4.2 Regras de Rotação

- Cada membro recebe exactamente UMA vez no ciclo completo do grupo
- O número total de ciclos = número de membros (na configuração standard)
- A ordem de rotação é visível a todos os membros em qualquer momento
- Se um membro é removido, o seu ciclo é eliminado e os restantes reajustados
- Se um membro é adicionado, um novo ciclo é acrescentado no final
- O admin pode alterar a ordem dos ciclos FUTUROS (nunca retroactivos). Ciclos passados e o ciclo actual são imutáveis.

---

## 5. Contribuições

### 5.1 Ciclo de Contribuição

Cada ciclo tem um **deadline de contribuição** — a data até à qual todos os membros devem ter pago a sua contribuição.

```
Ciclo inicia
  → Sistema cria registos de contribuição pendente para cada membro
  → Notificação a todos: "O ciclo N começou. [Beneficiário] recebe este mês. 
     Contribuição de X Kz até [deadline]."
  → Membros pagam via provider de pagamento ou manualmente
  → Cada pagamento confirmado actualiza o estado do membro
  → Quando todos pagaram → payout ao beneficiário
  → Ciclo encerra → próximo ciclo inicia
```

### 5.2 Estados de Contribuição

```
PENDING → PROCESSING → CONFIRMED → (registado)
                    ↘ FAILED → PENDING (retry)
       → LATE (pago após deadline mas dentro do grace period)
       → MISSED (não pago após grace period — marca final)
       → MANUALLY_CONFIRMED (admin confirmou manualmente)
```

**PENDING** — contribuição criada, aguarda pagamento do membro.

**PROCESSING** — pagamento iniciado pelo membro via provider (é-Kwanza, MCX, etc). Aguarda callback de confirmação.

**CONFIRMED** — pagamento confirmado automaticamente pelo provider via callback/webhook. A confirmação inclui: referência da transacção, timestamp, montante confirmado.

**MANUALLY_CONFIRMED** — para pagamentos manuais (transferência bancária, cash). O membro envia comprovativo (foto/screenshot). O admin (ou treasurer) verifica e confirma manualmente. O sistema regista quem confirmou e quando.

**LATE** — contribuição paga após o deadline mas dentro do grace period. Registada como paga, mas conta como `late_payment` no histórico do membro. Se multa estiver configurada, a multa é calculada e adicionada.

**MISSED** — o membro não pagou após o deadline + grace period. Estado final. Impacto: reliability score diminui, o pool do ciclo fica incompleto, e o admin decide como proceder (ver secção "Pagamento em Falta").

**FAILED** — tentativa de pagamento via provider falhou (saldo insuficiente, erro técnico, timeout). O membro é notificado e pode tentar novamente. A contribuição volta a PENDING.

### 5.3 Deadlines e Grace Period

- O deadline de contribuição é calculado automaticamente com base na frequência do grupo e na data de início
- O grace period é configurável pelo admin (default: 3 dias, máximo: 7 dias)
- Notificações automáticas são enviadas em momentos-chave:
  - **Início do ciclo:** "[Beneficiário] recebe este ciclo. Contribuição até [deadline]."
  - **3 dias antes do deadline:** "A tua contribuição de X Kz vence em 3 dias."
  - **1 dia antes:** "A tua contribuição vence amanhã."
  - **No dia do deadline:** "Hoje é o último dia para contribuir."
  - **Após deadline (grace period):** "A tua contribuição está atrasada. Tens mais [N] dias."
  - **Após grace period:** "A tua contribuição foi marcada como não paga."
- O beneficiário do ciclo TAMBÉM contribui para o pool (contribui para si próprio). Isto mantém a simetria — em cada ciclo, todos pagam, e o beneficiário recebe N × valor (incluindo a sua própria contribuição).

### 5.4 Multas por Atraso

Configurável pelo admin na criação do grupo:

- `late_payment_penalty_pct`: percentagem sobre o valor da contribuição (default: 0%)
- Exemplo: contribuição de 50.000 Kz com multa de 5% = 2.500 Kz de multa por atraso
- A multa aplica-se quando o membro paga após o deadline mas dentro do grace period
- A multa é adicionada ao pool do ciclo (beneficia o beneficiário) OU acumulada num fundo do grupo (configurável)
- Contribuições MISSED (não pagas após grace period) não geram multa — geram impacto no reliability score e potencial remoção

### 5.5 Pagamento em Falta (Contribuição MISSED)

Quando um membro não paga após o deadline + grace period:

1. A contribuição é marcada como MISSED
2. O sistema notifica o admin: "[Nome] não contribuiu no ciclo N."
3. O admin tem 3 opções:
   - **Prosseguir com payout parcial:** o beneficiário recebe o pool incompleto (valor total - contribuição em falta). O sistema regista que o payout foi parcial.
   - **Aguardar:** o admin dá mais tempo ao membro (extensão informal). O deadline do payout é adiado. Máximo de 2 extensões por ciclo.
   - **Activar garantia do grupo:** se o grupo tem fundo de reserva (ver secção "Fundo de Reserva"), o valor em falta é coberto pelo fundo. O membro mantém a dívida ao fundo.
4. Independentemente da opção escolhida, o reliability score do membro é afectado

---

## 6. Payouts (Disbursement)

### 6.1 Quando o Payout é Executado

O payout ao beneficiário é executado quando TODAS as contribuições do ciclo estão confirmadas (automática ou manualmente). Se existem contribuições MISSED, o admin deve tomar uma decisão (ver 5.5) antes do payout ser processado.

### 6.2 Método de Payout

O beneficiário define o seu método de payout preferido no seu perfil de membro:
- é-Kwanza (número de conta)
- MCX (número de telefone)
- Unitel Money (número de telefone)
- Transferência bancária (IBAN/NIB + nome do banco)

O sistema inicia a transferência automaticamente via o provider escolhido. Se a transferência falhar, o sistema tenta novamente até 3 vezes com intervalo de 1 hora. Se todas as tentativas falharem, o admin é notificado para resolver manualmente.

### 6.3 Confirmação de Recepção

Após o payout ser processado pelo provider, o sistema:
1. Actualiza o estado do payout para COMPLETED
2. Notifica todo o grupo: "[Beneficiário] recebeu X Kz ✓"
3. O ciclo é marcado como completo
4. O próximo ciclo é automaticamente iniciado (se houver ciclos restantes)

### 6.4 Estados do Payout

```
PENDING → READY → PROCESSING → COMPLETED
                             ↘ FAILED → PROCESSING (retry até 3x)
                                      ↘ MANUAL_REQUIRED (admin resolve)
```

---

## 7. Pagamentos — Integração com Providers

### 7.1 Princípio Geral

Cada contribuição e cada payout passa por um provider de pagamento real. O sistema confirma pagamentos via callbacks/webhooks dos providers — não por declaração do utilizador.

### 7.2 Fluxo por Provider

**é-Kwanza (MVP — prioridade 1):**
```
Contribuição:
  1. Membro clica "Pagar" na app
  2. Sistema gera pedido de pagamento via API é-Kwanza
  3. Membro é redireccionado para é-Kwanza (deeplink ou redirect)
  4. Membro autoriza pagamento na app é-Kwanza
  5. é-Kwanza envia callback ao nosso backend
  6. Backend confirma contribuição e notifica o grupo

Payout:
  1. Pool completo → sistema inicia transferência via API é-Kwanza
  2. é-Kwanza processa transferência para conta do beneficiário
  3. Callback confirma recepção
  4. Sistema marca payout como COMPLETED
```

**Manual com comprovativo (fallback universal):**
```
Contribuição:
  1. Membro faz transferência/depósito por qualquer meio
  2. Membro faz upload de comprovativo (foto ou screenshot) na app
  3. (Opcional) OCR extrai dados do comprovativo: valor, data, referência
  4. Admin (ou treasurer) recebe notificação para confirmar
  5. Admin verifica e confirma manualmente
  6. Contribuição marcada como MANUALLY_CONFIRMED
```

### 7.3 Conta Pool

As contribuições dos membros são dirigidas para uma conta/referência centralizada gerida pelo O Financeiro (modelo de custódia) ou directamente para a conta do beneficiário do ciclo (modelo directo).

**MVP — Modelo Directo:** cada membro paga directamente ao beneficiário. O sistema apenas confirma e rastreia. Sem custódia de fundos. Isto evita requisitos regulatórios de e-money/custódia.

**Futuro — Modelo Custódia:** o O Financeiro mantém os fundos numa conta intermediária e só liberta ao beneficiário quando todas as contribuições estão confirmadas. Requer licença ou parceria com instituição financeira regulada.

---

## 8. Fundo de Reserva (Opcional)

Configurável pelo admin na criação do grupo. Se activado:

- Cada ciclo, uma percentagem extra (ex: 5%) é cobrada sobre a contribuição
- Esse valor vai para um fundo de reserva do grupo
- O fundo é usado para cobrir contribuições MISSED (garante que o beneficiário recebe o pool completo mesmo quando alguém falta)
- O fundo é distribuído proporcionalmente entre os membros quando o grupo completa ou dissolve
- O saldo do fundo é visível a todos os membros

Regras:
- `reserve_fund_enabled`: boolean (default: false)
- `reserve_fund_pct`: percentagem extra por contribuição (default: 5%, máximo: 10%)
- O fundo só pode ser usado para cobrir contribuições MISSED — nunca para outro fim
- Se o fundo não é suficiente para cobrir a falta, o beneficiário recebe payout parcial

---

## 9. Reliability Score

### 9.1 Cálculo

O reliability score é um valor de 0 a 100 calculado por membro, baseado no seu histórico em TODAS as kixikilas em que participou (não apenas no grupo actual).

**Fórmula base:**
```
reliability_score = base_score - late_penalty - missed_penalty + bonus

Onde:
  base_score = 100 (todos começam com 100)
  late_penalty = (late_payments / total_contributions) × 30
  missed_penalty = (missed_payments / total_contributions) × 60
  bonus = min(10, consecutive_on_time_payments × 0.5)
```

**Exemplo:**
- 20 contribuições totais, 2 atrasadas, 1 faltada, 17 a tempo
- late_penalty = (2/20) × 30 = 3
- missed_penalty = (1/20) × 60 = 3
- bonus = min(10, 5 × 0.5) = 2.5 (5 pagamentos consecutivos a tempo recentes)
- score = 100 - 3 - 3 + 2.5 = 96.5

### 9.2 Visibilidade

- Cada membro vê o seu próprio score
- O admin vê os scores de todos os membros do grupo
- Quando um novo membro pede para entrar num grupo, o admin vê o reliability score desse membro (calculado com base noutras kixikilas)
- Membros normais NÃO vêem os scores dos outros membros (privacidade) — apenas o admin
- Um membro sem histórico (primeira kixikila) começa com score 100

### 9.3 Impacto do Score

O score é informativo — não bloqueia automaticamente acções. O admin decide se aceita ou rejeita membros com base no score. O sistema pode sugerir: "Este membro tem score 62 — abaixo da média. Historicamente faltou 3 de 15 contribuições. Aceitar mesmo assim?"

---

## 10. Notificações

### 10.1 Canais de Notificação

As notificações são enviadas via:
1. **Push notification** (app mobile) — se o utilizador tem a app instalada
2. **WhatsApp** — se o utilizador está conectado via WhatsApp
3. **In-app** (web/mobile) — sempre visível no centro de notificações da app

O utilizador pode configurar quais canais recebe. Por default, todos os activos estão ligados.

### 10.2 Eventos que Geram Notificação

**Para TODOS os membros do grupo:**

| Evento | Mensagem (exemplo) | Timing |
|---|---|---|
| Ciclo inicia | "Ciclo 3 iniciado. Maria recebe este mês. Contribuição de 50.000 Kz até 15/Maio." | Imediato |
| Membro pagou | "João pagou ✓ (3/10 membros pagaram)" | Imediato |
| Todos pagaram | "Todas as contribuições do ciclo 3 confirmadas! ✓" | Imediato |
| Payout concluído | "Maria recebeu 500.000 Kz ✓" | Imediato |
| Novo membro entrou | "Pedro juntou-se ao grupo" | Imediato |
| Membro saiu/removido | "Ana saiu do grupo" | Imediato |
| Grupo pausado | "O grupo foi pausado pelo admin" | Imediato |
| Grupo retomado | "O grupo foi retomado. Próximo ciclo: [data]" | Imediato |
| Grupo completo | "Parabéns! A kixikila 'Amigos do Bairro' completou todos os ciclos." | Imediato |

**Para o MEMBRO individual:**

| Evento | Mensagem (exemplo) | Timing |
|---|---|---|
| Lembrete 3 dias | "A tua contribuição de 50.000 Kz vence em 3 dias" | 3 dias antes |
| Lembrete 1 dia | "A tua contribuição vence amanhã" | 1 dia antes |
| Lembrete deadline | "Hoje é o último dia para contribuir" | No dia |
| Contribuição atrasada | "A tua contribuição está atrasada. Tens mais [N] dias." | Após deadline |
| Contribuição marcada MISSED | "A tua contribuição não foi registada. Contacta o admin." | Após grace |
| É o teu ciclo | "É a tua vez de receber! O pool está a ser recolhido." | Início do ciclo |
| Payout a caminho | "O teu payout de X Kz está a ser processado" | Quando pool completo |
| Payout recebido | "Recebeste X Kz da kixikila 'Amigos do Bairro' ✓" | Quando confirmado |

**Para o ADMIN:**

| Evento | Mensagem (exemplo) | Timing |
|---|---|---|
| Novo pedido de adesão | "[Nome] (score: 85) quer juntar-se ao grupo. Aprovar?" | Imediato |
| Membro atrasado | "[Nome] não contribuiu e está no grace period" | Após deadline |
| Membro MISSED | "[Nome] não contribuiu. Acção necessária." | Após grace |
| Payout falhou | "Payout para [Nome] falhou. Verificar dados de pagamento." | Após 3 retries |

---

## 11. Permissões

| Acção | Admin | Treasurer | Member |
|---|---|---|---|
| Criar grupo | ✓ | — | — |
| Editar configurações (antes de iniciar) | ✓ | — | — |
| Editar configurações operacionais (activo) | ✓ | — | — |
| Aprovar/rejeitar membros | ✓ | — | — |
| Remover membros | ✓ | — | — |
| Definir ordem de rotação | ✓ | — | — |
| Pausar/retomar grupo | ✓ | — | — |
| Iniciar dissolução | ✓ | — | — |
| Confirmar pagamentos manuais | ✓ | ✓ | — |
| Ver reliability scores de todos | ✓ | — | — |
| Ver relatórios financeiros detalhados | ✓ | ✓ | — |
| Fazer contribuição | ✓ | ✓ | ✓ |
| Ver dashboard do grupo | ✓ | ✓ | ✓ |
| Ver quem pagou/falta | ✓ | ✓ | ✓ |
| Ver próprio reliability score | ✓ | ✓ | ✓ |
| Sair do grupo | ✓* | ✓ | ✓ |
| Transferir papel de admin | ✓ | — | — |

*O admin só pode sair se transferir o papel para outro membro primeiro.

---

## 12. Ecrãs e Interfaces

### 12.1 Lista de Kixikilas (Home)

Mostra todas as kixikilas em que o utilizador participa. Para cada uma:
- Nome do grupo
- Próximo deadline de contribuição (ou "Completa")
- Estado do grupo (ícone colorido)
- A tua contribuição deste ciclo: Paga ✓ / Pendente / Atrasada
- Quem recebe este ciclo
- Progresso do pool (ex: "7/10 pagaram")
- Botão "+ Criar kixikila" e "Juntar-se a kixikila" (inserir código)

### 12.2 Dashboard do Grupo

Visão geral de um grupo específico:
- **Header:** nome, valor de contribuição, frequência, número de membros
- **Ciclo actual:** beneficiário, deadline, progresso de contribuições (barra ou lista)
- **Lista de membros com estado:** ✓ pagou, ⏳ pendente, ⚠️ atrasado, ✗ faltou
- **Próximos ciclos:** lista dos próximos beneficiários na rotação
- **Botão "Contribuir"** (se a contribuição do utilizador está pendente)
- **Histórico de ciclos:** lista dos ciclos passados com detalhes

### 12.3 Ecrã de Contribuição

Quando o utilizador clica "Contribuir":
1. Mostra valor a pagar e deadline
2. Seleccionar método de pagamento (é-Kwanza, MCX, Manual, etc.)
3. Se provider digital: redirect para o provider → callback → confirmação
4. Se manual: formulário de upload de comprovativo + campo de referência
5. Confirmação: "Contribuição registada. Aguarda confirmação." ou "Contribuição confirmada ✓"

### 12.4 Ecrã de Criação de Grupo

Formulário com:
- Nome do grupo (obrigatório)
- Descrição (opcional)
- Valor de contribuição (obrigatório, em Kz)
- Frequência: semanal / quinzenal / mensal (obrigatório)
- Tipo de rotação: fixa / aleatória / por necessidade (default: fixa)
- Data de início prevista (obrigatório)
- Grace period: 1-7 dias (default: 3)
- Multa por atraso: 0-10% (default: 0%)
- Fundo de reserva: sim/não (default: não). Se sim: percentagem (default: 5%)
- Aprovação de membros: sim/não (default: sim)
- Mínimo de membros para iniciar (default: 3)
- Máximo de membros (default: 20)

Após criar: gera código de convite e mostra opções de partilha (WhatsApp, copiar link, QR code).

### 12.5 Ecrã de Gestão de Membros (Admin)

- Lista de membros com: nome, papel, posição na rotação, reliability score, estado
- Acções por membro: promover a treasurer, alterar posição, remover
- Pedidos de adesão pendentes (com reliability score e histórico resumido)
- Botão para partilhar código de convite

### 12.6 Ecrã de Relatório de Ciclo

Gerado automaticamente no final de cada ciclo:
- Resumo: beneficiário, valor recebido, data
- Lista de contribuições: quem pagou, quando, método
- Atrasos: quem pagou atrasado e quanto tempo de atraso
- Faltas: quem não pagou
- Saldo do fundo de reserva (se aplicável)
- Botão "Partilhar relatório" (gera imagem ou texto para WhatsApp)

---

## 13. Regras de Negócio Adicionais

### 13.1 Valor de Contribuição

- O valor é fixo para todos os membros e para todos os ciclos
- Definido na criação do grupo e não pode ser alterado depois do grupo iniciar
- Valor mínimo: 1.000 Kz
- Valor máximo: 10.000.000 Kz (para evitar abuso)
- O beneficiário contribui para si próprio (o pool é N × valor, não (N-1) × valor)

### 13.2 Frequência

- Semanal: contribuição toda a semana (deadline no dia definido, ex: sexta-feira)
- Quinzenal: contribuição a cada 2 semanas
- Mensal: contribuição mensal (deadline no dia definido, ex: dia 25)
- Não é possível alterar a frequência depois do grupo iniciar

### 13.3 Múltiplas Kixikilas

- Um utilizador pode participar em múltiplas kixikilas simultaneamente
- O dashboard pessoal mostra todas as kixikilas activas com próximos deadlines
- O sistema pode alertar: "Tens 3 contribuições esta semana: Grupo A (50K), Grupo B (30K), Grupo C (20K). Total: 100K."
- O reliability score é calculado globalmente (todas as kixikilas)

### 13.4 Disputa

Se um membro contesta uma contribuição ou payout:
- O membro pode abrir uma disputa via a app (campo de texto com descrição)
- O admin é notificado
- O sistema não tem mecanismo de resolução automática — a resolução é responsabilidade do admin e do grupo
- A disputa é registada no histórico do grupo
- Durante uma disputa, o ciclo pode ser pausado pelo admin

### 13.5 Privacidade

- Cada membro vê: nomes dos membros, quem pagou, quem falta, ordem de rotação, saldos do pool
- Cada membro NÃO vê: reliability scores de outros membros, detalhes de pagamento de outros (referências bancárias, etc.), histórico de outros em outras kixikilas
- O admin vê reliability scores de todos os membros do grupo e pedidos de adesão com score
- Nenhum membro vê dados financeiros pessoais de outro membro fora do contexto da kixikila

### 13.6 Arquivamento

- Grupos COMPLETED e DISSOLVED são arquivados automaticamente após 30 dias
- Dados arquivados mantêm-se acessíveis para consulta de histórico e cálculo de reliability scores
- Dados não são eliminados (necessários para scores e compliance)

---

## 14. API Endpoints (Referência)

Estrutura sugerida para os endpoints REST:

```
POST   /api/kixikila/groups                    — Criar grupo
GET    /api/kixikila/groups                    — Listar grupos do utilizador
GET    /api/kixikila/groups/:id                — Detalhes do grupo
PATCH  /api/kixikila/groups/:id                — Editar grupo (admin)
POST   /api/kixikila/groups/:id/start          — Iniciar grupo (admin)
POST   /api/kixikila/groups/:id/pause          — Pausar grupo (admin)
POST   /api/kixikila/groups/:id/resume         — Retomar grupo (admin)
POST   /api/kixikila/groups/:id/dissolve       — Dissolver grupo (admin)

POST   /api/kixikila/groups/:id/join           — Pedir para entrar (com código)
POST   /api/kixikila/groups/:id/members/:mid/approve  — Aprovar membro (admin)
POST   /api/kixikila/groups/:id/members/:mid/reject   — Rejeitar membro (admin)
POST   /api/kixikila/groups/:id/members/:mid/remove    — Remover membro (admin)
POST   /api/kixikila/groups/:id/leave          — Sair do grupo
GET    /api/kixikila/groups/:id/members        — Listar membros

GET    /api/kixikila/groups/:id/cycles         — Listar ciclos
GET    /api/kixikila/groups/:id/cycles/current — Ciclo actual
GET    /api/kixikila/cycles/:cid               — Detalhes do ciclo

POST   /api/kixikila/cycles/:cid/contribute    — Iniciar contribuição
POST   /api/kixikila/contributions/:id/confirm — Confirmar manualmente (admin)
GET    /api/kixikila/contributions/:id/status   — Estado da contribuição

POST   /api/kixikila/cycles/:cid/payout        — Iniciar payout (automático ou admin)
GET    /api/kixikila/payouts/:id/status         — Estado do payout

POST   /api/kixikila/webhooks/ekwanza          — Webhook é-Kwanza
POST   /api/kixikila/webhooks/mcx              — Webhook MCX

GET    /api/kixikila/groups/:id/report/:cycle   — Relatório do ciclo
GET    /api/kixikila/users/me/score             — Meu reliability score
GET    /api/kixikila/groups/:id/invite-code     — Obter/regenerar código de convite
```

---

## 15. Regras de Validação

| Campo | Regra |
|---|---|
| contribution_amount | > 0, ≤ 10.000.000, duas casas decimais |
| min_members | ≥ 2, ≤ max_members |
| max_members | ≥ min_members, ≤ 50 |
| late_payment_grace_days | 1-7 |
| late_payment_penalty_pct | 0-10 |
| reserve_fund_pct | 0-10 |
| cycle_frequency | enum: 'weekly', 'biweekly', 'monthly' |
| rotation_type | enum: 'fixed', 'random', 'need_based' |
| group name | 3-100 caracteres, sem caracteres especiais perigosos |
| invite_code | 8 caracteres alfanuméricos, gerado pelo sistema, único |

---

*Fim do documento. Este documento deve ser utilizado pelo Claude Code como especificação funcional para implementação do módulo Kixikila.*
