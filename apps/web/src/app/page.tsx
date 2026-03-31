import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Check,
  Eye,
  Banknote,
  PiggyBank,
  Receipt,
  Repeat,
  Target,
  Users,
  BarChart3,
  ChevronRight,
} from "lucide-react"

const features = [
  {
    icon: Eye,
    title: "Veja todos os seus gastos num só lugar",
    description:
      "Junte todas as suas contas e saiba exactamente quanto gastou, em que categoria, e quanto resta. Sem surpresas no fim do mês.",
  },
  {
    icon: PiggyBank,
    title: "Orçamentos que protegem o seu dinheiro",
    description:
      "Defina limites por categoria com 5 métodos diferentes. Receba alertas antes de ultrapassar. Rollover para o mês seguinte.",
  },
  {
    icon: Target,
    title: "Metas de poupança que funcionam",
    description:
      "Defina objectivos com prazos reais. Contribua com qualquer frequência — semanal, mensal, trimestral. Acompanhe o progresso visual.",
  },
  {
    icon: Users,
    title: "Finanças da família, organizadas em conjunto",
    description:
      "Partilhe contas com o seu cônjuge. Divida despesas entre membros. Controle gastos dos dependentes com permissões granulares.",
  },
  {
    icon: Receipt,
    title: "Contas a pagar nunca mais esquecidas",
    description:
      "Registe as suas facturas recorrentes — água, luz, internet. Receba lembretes antes do vencimento. Marque como pago com um toque.",
  },
  {
    icon: Banknote,
    title: "Controle todas as suas fontes de rendimento",
    description:
      "Registe salários, rendas, freelance e outros rendimentos. Saiba exactamente quando e quanto entra na sua conta.",
  },
  {
    icon: Repeat,
    title: "Transacções recorrentes automáticas",
    description:
      "Crie regras para gastos e receitas que se repetem. O sistema regista automaticamente com a frequência que definir.",
  },
  {
    icon: Bell,
    title: "Alertas que evitam surpresas",
    description:
      "Notificações de saldo baixo, orçamento em risco, facturas a vencer, e metas atingidas. Sempre informado, sempre no controlo.",
  },
  {
    icon: BarChart3,
    title: "Relatórios que mostram a verdade",
    description:
      "Gráficos claros sobre receitas, despesas e tendências. Resumos mensais automáticos com score financeiro de 0 a 100.",
  },
]

const plans = [
  {
    name: "Pessoal",
    price: "1.490",
    suffix: "Kz/mês",
    description: "Controlo total das suas finanças",
    features: [
      "Contas e transacções ilimitadas",
      "Assistente IA completo",
      "Fotografar recibos (OCR inteligente)",
      "Orçamentos avançados com alertas",
      "Metas de poupança e investimentos",
      "Património e relatórios completos",
    ],
    cta: "Começar 90 dias grátis",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Familiar",
    price: "3.490",
    suffix: "Kz/mês",
    description: "Gestão financeira para toda a família",
    features: [
      "Tudo do Pessoal",
      "Até 5 membros incluídos",
      "Contas e orçamentos partilhados",
      "Metas familiares em conjunto",
      "Divisão de despesas inteligente",
      "Relatórios por membro",
      "Membros extra: +490 Kz/mês cada",
    ],
    cta: "Começar 90 dias grátis",
    href: "/register",
    highlighted: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Banknote className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">O Financeiro</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#funcionalidades" className="text-muted-foreground transition-colors hover:text-foreground">
              Funcionalidades
            </a>
            <a href="#precos" className="text-muted-foreground transition-colors hover:text-foreground">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Já tenho conta
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — asymmetric layout */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-5">
          {/* Left — text, takes 3 cols */}
          <div className="lg:col-span-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Saiba exactamente para onde vai o seu dinheiro
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Junte todas as suas contas e finalmente tenha clareza sobre as suas finanças pessoais e familiares.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(21,128,61,0.3)]"
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                Já tenho conta
              </Link>
            </div>

          </div>

          {/* Right — dashboard mockup, takes 2 cols */}
          <div className="hidden lg:col-span-2 lg:block">
            <div className="rounded-2xl bg-card p-5 shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
              {/* Mini dashboard mockup */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-muted-foreground">O Financeiro</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Património líquido</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">1.245.800 Kz</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-[11px] text-muted-foreground">Receitas</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-green-600">+480.000 Kz</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-[11px] text-muted-foreground">Despesas</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-red-500">-312.500 Kz</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Alimentação</span>
                    <span className="font-mono text-muted-foreground">68%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: "68%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Transportes</span>
                    <span className="font-mono text-muted-foreground">42%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: "42%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Educação</span>
                    <span className="font-mono text-muted-foreground">91%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: "91%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features */}
      <section id="funcionalidades" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Porque usar O Financeiro
          </p>
          <h2 className="mt-3 max-w-lg text-2xl font-bold tracking-tight sm:text-3xl">
            Controlo financeiro sem complicações
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Funcionalidades pensadas para a forma como realmente gere o seu dinheiro no dia-a-dia.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group flex gap-5 rounded-xl bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preços
          </p>
          <h2 className="mt-3 max-w-lg text-2xl font-bold tracking-tight sm:text-3xl">
            Planos simples, em Kwanzas
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Sem plano gratuito limitado. Acesso completo desde o primeiro dia.
          </p>

          {/* Launch promotion banner */}
          <div className="mt-8 rounded-xl bg-primary/10 border border-primary/20 p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-lg text-primary-foreground">%</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Promoção de lançamento</p>
              <p className="text-sm text-muted-foreground">
                Registe-se agora e receba <span className="font-bold text-foreground">90 dias grátis</span> em qualquer plano. Sem compromisso, cancele quando quiser.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl p-6 ${
                  plan.highlighted
                    ? "border-2 border-primary bg-card shadow-[0_4px_16px_rgba(21,128,61,0.12)]"
                    : "bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="mb-3 inline-block self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Mais popular
                  </span>
                )}
                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="font-mono text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">{plan.suffix}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 block rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-accent"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Comece hoje. É grátis.
              </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
                Junte-se a quem já sabe exactamente para onde vai cada Kwanza. Sem compromisso.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90"
                >
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Já tenho conta
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="rounded-xl bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">Registe-se em menos de 1 minuto</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">Adicione as suas contas e comece a registar</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">Veja as suas finanças com total clareza</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Banknote className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">O Financeiro</span>
          </div>
          <p>Gestão financeira pessoal e familiar</p>
        </div>
      </footer>
    </div>
  )
}
