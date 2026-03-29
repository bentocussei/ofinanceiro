import Link from "next/link"
import {
  Wallet,
  PieChart,
  Bot,
  Users,
  ArrowRight,
  Check,
  Shield,
  TrendingUp,
  BarChart3,
  Target,
  Smartphone,
  Banknote,
} from "lucide-react"

const features = [
  {
    icon: Wallet,
    title: "Contas e Transaccoes",
    description:
      "Gira todas as suas contas bancarias, multicaixa e dinheiro em mao num unico lugar.",
  },
  {
    icon: PieChart,
    title: "Orcamentos Inteligentes",
    description:
      "Crie orcamentos mensais e acompanhe os seus gastos por categoria automaticamente.",
  },
  {
    icon: Bot,
    title: "Assistente IA",
    description:
      "Converse com o assistente para registar transaccoes, obter relatorios e conselhos financeiros.",
  },
  {
    icon: Users,
    title: "Gestao Familiar",
    description:
      "Partilhe financas com a familia. Defina limites, acompanhe gastos e alcance metas juntos.",
  },
  {
    icon: BarChart3,
    title: "Relatorios Detalhados",
    description:
      "Visualize as suas financas com graficos claros. Saiba exactamente para onde vai o seu dinheiro.",
  },
  {
    icon: Target,
    title: "Metas Financeiras",
    description:
      "Defina objectivos de poupanca e acompanhe o progresso. De ferias a fundo de emergencia.",
  },
]

const plans = [
  {
    name: "Gratuito",
    price: "0",
    period: "para sempre",
    features: [
      "1 conta",
      "50 transaccoes/mes",
      "Orcamentos basicos",
      "Assistente IA limitado",
    ],
    cta: "Comecar gratis",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pessoal",
    price: "2.99",
    period: "/mes",
    features: [
      "Contas ilimitadas",
      "Transaccoes ilimitadas",
      "Orcamentos avancados",
      "Assistente IA completo",
      "Relatorios detalhados",
    ],
    cta: "Comecar agora",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Familia",
    price: "5.99",
    period: "/mes",
    features: [
      "Tudo do Pessoal",
      "Ate 4 membros",
      "Orcamento familiar",
      "Metas partilhadas",
      "Controlo parental",
    ],
    cta: "Comecar agora",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Familia+",
    price: "9.99",
    period: "/mes",
    features: [
      "Tudo do Familia",
      "Ate 8 membros",
      "Investimentos",
      "Consultoria IA premium",
      "Suporte prioritario",
    ],
    cta: "Comecar agora",
    href: "/register",
    highlighted: false,
  },
]

const stats = [
  { value: "10.000+", label: "Utilizadores activos" },
  { value: "2M+", label: "Transaccoes registadas" },
  { value: "99.9%", label: "Disponibilidade" },
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
              Precos
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-primary/4 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Smartphone className="h-3.5 w-3.5" />
            Adaptado a realidade angolana
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Controle total das suas{" "}
            <span className="text-primary">financas pessoais</span>{" "}
            e familiares
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Registe transaccoes, crie orcamentos, defina metas de poupanca e
            receba conselhos inteligentes com IA. Multicaixa, BAI, BFA e
            dinheiro em mao, tudo num unico lugar.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(21,128,61,0.3)]"
            >
              Comecar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              Ja tenho conta
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Seguro e privado
            </span>
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Gratis para comecar
            </span>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">
            Funcionalidades
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Tudo o que precisa para gerir as suas financas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Funcionalidades desenhadas para a realidade financeira angolana.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="rounded-xl bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[15px] font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">
            Precos
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Planos simples e transparentes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Comece gratis e faca upgrade quando precisar de mais.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl p-6 ${
                  plan.highlighted
                    ? "border-2 border-primary bg-card shadow-[0_4px_16px_rgba(21,128,61,0.12)]"
                    : "border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="mb-3 inline-block self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Mais popular
                  </span>
                )}
                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {" "}{plan.period}
                  </span>
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

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Comece a controlar as suas financas hoje
          </h2>
          <p className="mt-4 text-muted-foreground">
            Junte-se a milhares de angolanos que ja usam O Financeiro para organizar
            a vida financeira da familia.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90"
            >
              Criar conta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          O Financeiro -- Gestao financeira para Angola e PALOP
        </div>
      </footer>
    </div>
  )
}
