/**
 * Tour definitions for each page/context.
 *
 * Each tour is an array of driver.js steps. The `element` field uses
 * CSS selectors — the component must have `data-tour="<id>"` attributes
 * on the target elements for the highlight to work.
 *
 * If `element` is omitted, the step renders as a centered modal (no
 * highlight) — useful for welcome/intro steps.
 */

import type { DriveStep } from "driver.js"

// ---------------------------------------------------------------------------
// Dashboard — shown after onboarding or first login
// ---------------------------------------------------------------------------

export const dashboardTour: DriveStep[] = [
  {
    popover: {
      title: "Bem-vindo ao O Financeiro",
      description:
        "Este é o teu painel principal. Aqui tens uma visão completa das tuas finanças — saldos, receitas, despesas, metas e muito mais. Vamos fazer um tour rápido.",
    },
  },
  {
    element: '[data-tour="net-worth"]',
    popover: {
      title: "Património Líquido",
      description:
        "O valor total dos teus activos (contas + investimentos + bens) menos as tuas dívidas. Este número mostra a tua posição financeira real.",
    },
  },
  {
    element: '[data-tour="cashflow"]',
    popover: {
      title: "Fluxo de Caixa",
      description:
        "Quanto recebeste e quanto gastaste este mês. A diferença é o que poupaste.",
    },
  },
  {
    element: '[data-tour="recent-transactions"]',
    popover: {
      title: "Transacções Recentes",
      description:
        "As últimas transacções registadas. Clica em qualquer uma para ver os detalhes ou editar.",
    },
  },
  {
    element: '[data-tour="accounts-summary"]',
    popover: {
      title: "As tuas Contas",
      description:
        "Saldos de todas as tuas contas — banco, carteira, mobile money. Clica para gerir.",
    },
  },
  {
    element: '[data-tour="budget-summary"]',
    popover: {
      title: "Orçamento",
      description:
        "Vê quanto já gastaste em cada categoria. As barras mostram o progresso — amarelo é alerta, vermelho é limite excedido.",
    },
  },
  {
    element: '[data-tour="goals-summary"]',
    popover: {
      title: "Metas de Poupança",
      description:
        "Define objectivos de poupança e acompanha o progresso. Cada contribuição aproxima-te do teu sonho.",
    },
  },
  {
    element: '[data-tour="sidebar-assistant"]',
    popover: {
      title: "Assistente IA",
      description:
        "O teu consultor financeiro pessoal. Pergunta qualquer coisa — 'quanto gastei em gasolina?', 'posso comprar X?', 'gera o meu relatório'. Ele faz tudo por ti.",
      side: "right",
    },
  },
  {
    element: '[data-tour="context-switcher"]',
    popover: {
      title: "Pessoal e Família",
      description:
        "Muda entre o teu contexto pessoal e o da tua família. As finanças são completamente separadas — cada um tem o seu espaço.",
      side: "right",
    },
  },
  {
    popover: {
      title: "Pronto para começar",
      description:
        "Já conheces o essencial. Começa por registar um gasto — escreve no Assistente 'gastei 5000 no almoço' e ele faz o resto. Boas finanças!",
    },
  },
]

// ---------------------------------------------------------------------------
// Transactions page
// ---------------------------------------------------------------------------

export const transactionsTour: DriveStep[] = [
  {
    popover: {
      title: "Transacções",
      description:
        "Aqui estão todas as tuas transacções — gastos, receitas e transferências. Podes filtrar por tipo, período e pesquisar.",
    },
  },
  {
    element: '[data-tour="new-transaction"]',
    popover: {
      title: "Registar Transacção",
      description:
        "Clica aqui para registar um gasto ou receita manualmente. Ou usa o Assistente — diz 'gastei X em Y' e ele regista por ti.",
    },
  },
  {
    element: '[data-tour="transaction-filters"]',
    popover: {
      title: "Filtros",
      description:
        "Filtra por tipo (despesas, receitas) e por período (7 dias, mês, ano). Encontra exactamente o que procuras.",
    },
  },
]

// ---------------------------------------------------------------------------
// Budget page
// ---------------------------------------------------------------------------

export const budgetTour: DriveStep[] = [
  {
    popover: {
      title: "Orçamentos",
      description:
        "Define limites de gastos por categoria para cada mês. O Financeiro conta automaticamente quanto gastaste em cada uma.",
    },
  },
  {
    element: '[data-tour="new-budget"]',
    popover: {
      title: "Criar Orçamento",
      description:
        "Cria o teu primeiro orçamento: escolhe categorias (alimentação, transporte, lazer...) e define limites mensais.",
    },
  },
]

// ---------------------------------------------------------------------------
// Goals page
// ---------------------------------------------------------------------------

export const goalsTour: DriveStep[] = [
  {
    popover: {
      title: "Metas de Poupança",
      description:
        "Define objectivos financeiros — férias, carro, fundo de emergência — e acompanha o progresso a cada contribuição.",
    },
  },
  {
    element: '[data-tour="new-goal"]',
    popover: {
      title: "Nova Meta",
      description:
        "Cria a tua primeira meta: nome, valor alvo, data limite. Depois é só ir contribuindo.",
    },
  },
]

// ---------------------------------------------------------------------------
// Debts page
// ---------------------------------------------------------------------------

export const debtsTour: DriveStep[] = [
  {
    popover: {
      title: "Gestão de Dívidas",
      description:
        "Regista as tuas dívidas — empréstimos, créditos, informais — e acompanha o pagamento. Simula quanto poupas se pagares mais.",
    },
  },
  {
    element: '[data-tour="new-debt"]',
    popover: {
      title: "Registar Dívida",
      description:
        "Adiciona uma dívida com o valor, taxa de juros e prestação mensal. O app calcula quanto falta e quando acabas de pagar.",
    },
  },
]

// ---------------------------------------------------------------------------
// Investments page
// ---------------------------------------------------------------------------

export const investmentsTour: DriveStep[] = [
  {
    popover: {
      title: "Investimentos",
      description:
        "Acompanha os teus investimentos — depósitos a prazo, obrigações, acções, poupanças. Vê o rendimento e a performance do portfolio.",
    },
  },
  {
    element: '[data-tour="new-investment"]',
    popover: {
      title: "Novo Investimento",
      description:
        "Regista um investimento: nome, tipo, valor investido, taxa de retorno. O app calcula o crescimento.",
    },
  },
]

// ---------------------------------------------------------------------------
// Assistant page
// ---------------------------------------------------------------------------

export const assistantTour: DriveStep[] = [
  {
    popover: {
      title: "O teu Assistente Financeiro",
      description:
        "Fala com o assistente como falarias com um amigo. Ele consegue: registar transacções, consultar saldos, analisar gastos, verificar orçamentos, acompanhar metas, e muito mais.",
    },
  },
  {
    element: '[data-tour="chat-input"]',
    popover: {
      title: "Escreve aqui",
      description:
        "Experimenta: 'quanto tenho de saldo?', 'gastei 10000 em gasolina', 'como está o meu orçamento?', 'posso comprar um sofá de 100000?'",
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: "Atalhos",
      description:
        "Clica num atalho para perguntar directamente. São as perguntas mais comuns — saldo, gastos, orçamento, metas, dívidas.",
    },
  },
]

// ---------------------------------------------------------------------------
// Family dashboard — shown on first switch to family context
// ---------------------------------------------------------------------------

export const familyDashboardTour: DriveStep[] = [
  {
    popover: {
      title: "Finanças da Família",
      description:
        "Este é o painel familiar. Aqui vês as finanças partilhadas — contas conjuntas, orçamento doméstico, metas da família. Tudo separado do teu pessoal.",
    },
  },
  {
    element: '[data-tour="family-net-worth"]',
    popover: {
      title: "Património Familiar",
      description:
        "O valor total da família: contas partilhadas + investimentos familiares + bens da casa - dívidas familiares.",
    },
  },
  {
    element: '[data-tour="family-accounts"]',
    popover: {
      title: "Contas Partilhadas",
      description:
        "Contas que todos os membros podem usar. Quando qualquer membro regista um gasto aqui, aparece para todos.",
    },
  },
  {
    element: '[data-tour="family-members-spending"]',
    popover: {
      title: "Gastos por Membro",
      description:
        "Transparência total — vê quanto cada membro da família gastou este mês.",
    },
  },
  {
    element: '[data-tour="family-goals"]',
    popover: {
      title: "Metas Familiares",
      description:
        "Poupem juntos para objectivos comuns — férias, fundo escolar, casa nova. Todos os membros podem contribuir.",
    },
  },
]

// ---------------------------------------------------------------------------
// Accounts page
// ---------------------------------------------------------------------------

export const accountsTour: DriveStep[] = [
  {
    popover: {
      title: "As tuas Contas",
      description:
        "Aqui geres todas as tuas contas — banco, carteira, mobile money, poupança. Cada conta tem o seu saldo actualizado automaticamente com cada transacção.",
    },
  },
  {
    element: '[data-tour="new-account"]',
    popover: {
      title: "Adicionar Conta",
      description:
        "Adiciona uma nova conta: banco (BAI, BFA, BIC...), numerário (carteira), mobile money (Multicaixa Express), ou poupança. Define o saldo inicial.",
    },
  },
  {
    element: '[data-tour="account-summary"]',
    popover: {
      title: "Resumo",
      description:
        "Saldo total de todas as contas. Clica numa conta para ver detalhes, editar ou transferir dinheiro entre contas.",
    },
  },
]

// ---------------------------------------------------------------------------
// Assets page (Património / Bens físicos)
// ---------------------------------------------------------------------------

export const assetsTour: DriveStep[] = [
  {
    popover: {
      title: "Património — Bens Físicos",
      description:
        "Regista os teus bens para teres uma visão completa do teu património: veículos, imóveis, electrónica, mobiliário. O valor actual soma ao teu Património Líquido no dashboard.",
    },
  },
  {
    element: '[data-tour="new-asset"]',
    popover: {
      title: "Registar Bem",
      description:
        "Adiciona um bem: nome, tipo (veículo, imóvel, electrónica...), valor de compra e valor actual estimado. O valor deprecia com o tempo — actualiza periodicamente.",
    },
  },
]

// ---------------------------------------------------------------------------
// Reports page
// ---------------------------------------------------------------------------

export const reportsTour: DriveStep[] = [
  {
    popover: {
      title: "Relatórios Financeiros",
      description:
        "Analisa as tuas finanças em profundidade: gastos por categoria, evolução mensal, taxa de poupança e património líquido. Também podes pedir relatórios ao Assistente — 'gera o relatório do mês'.",
    },
  },
  {
    element: '[data-tour="spending-chart"]',
    popover: {
      title: "Gastos por Categoria",
      description:
        "Vê para onde vai o teu dinheiro. As categorias com mais peso aparecem primeiro — identifica onde podes poupar.",
    },
  },
]

// ---------------------------------------------------------------------------
// Income Sources page (Rendimentos)
// ---------------------------------------------------------------------------

export const incomeSourcesTour: DriveStep[] = [
  {
    popover: {
      title: "Fontes de Rendimento",
      description:
        "Regista as tuas fontes de rendimento — salário, freelance, rendas, negócio. Ter esta informação ajuda o Assistente a calcular a tua taxa de poupança e dar conselhos mais precisos.",
    },
  },
  {
    element: '[data-tour="new-income-source"]',
    popover: {
      title: "Nova Fonte",
      description:
        "Adiciona uma fonte: nome, valor mensal estimado e frequência (mensal, semanal, irregular). Não cria transacções automaticamente — serve como referência.",
    },
  },
]

// ---------------------------------------------------------------------------
// Bills page (Contas a Pagar)
// ---------------------------------------------------------------------------

export const billsTour: DriveStep[] = [
  {
    popover: {
      title: "Contas a Pagar",
      description:
        "Gere as tuas facturas e contas recorrentes — água (EPAL), luz (ENDE), internet, DSTV, propinas. Define datas de vencimento e recebe lembretes antes de vencer.",
    },
  },
  {
    element: '[data-tour="new-bill"]',
    popover: {
      title: "Nova Conta a Pagar",
      description:
        "Adiciona uma factura: nome, valor, data de vencimento e frequência. O sistema avisa-te quando está a aproximar-se do vencimento.",
    },
  },
]

// ---------------------------------------------------------------------------
// Recurring Rules page (Recorrentes)
// ---------------------------------------------------------------------------

export const recurringRulesTour: DriveStep[] = [
  {
    popover: {
      title: "Transacções Recorrentes",
      description:
        "Define regras para transacções que se repetem — salário, renda, assinatura DSTV, propinas mensais. O sistema cria a transacção automaticamente no dia definido.",
    },
  },
  {
    element: '[data-tour="new-recurring"]',
    popover: {
      title: "Nova Regra Recorrente",
      description:
        "Cria uma regra: descrição, valor, categoria, conta, frequência (diária, semanal, mensal, anual) e dia de execução. A transacção é registada automaticamente.",
    },
  },
]

// ---------------------------------------------------------------------------
// Family Members page
// ---------------------------------------------------------------------------

export const familyMembersTour: DriveStep[] = [
  {
    popover: {
      title: "Membros da Família",
      description:
        "Gere quem faz parte da tua família no O Financeiro. Cada membro pode registar transacções, contribuir para metas e ver os dados partilhados.",
    },
  },
  {
    element: '[data-tour="invite-code"]',
    popover: {
      title: "Código de Convite",
      description:
        "Partilha este código com familiares para se juntarem. Eles instalam a app, criam conta, e usam o código. Tu aprovas o pedido e eles ganham acesso ao contexto família.",
    },
  },
  {
    element: '[data-tour="members-list"]',
    popover: {
      title: "Lista de Membros",
      description:
        "Vê quem está na família, o papel de cada um (Admin, Adulto, Jovem) e as permissões. O Admin pode gerir membros e definir regras.",
    },
  },
]

// ---------------------------------------------------------------------------
// Map tour ID → steps for easy lookup
// ---------------------------------------------------------------------------

export const tourMap: Record<string, DriveStep[]> = {
  dashboard: dashboardTour,
  transactions: transactionsTour,
  budget: budgetTour,
  goals: goalsTour,
  debts: debtsTour,
  investments: investmentsTour,
  assistant: assistantTour,
  accounts: accountsTour,
  assets: assetsTour,
  reports: reportsTour,
  "income-sources": incomeSourcesTour,
  bills: billsTour,
  "recurring-rules": recurringRulesTour,
  "family-dashboard": familyDashboardTour,
  "family-members": familyMembersTour,
}
