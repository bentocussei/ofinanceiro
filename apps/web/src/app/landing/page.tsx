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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">O Financeiro</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Gestao financeira pessoal
          <br />e familiar com IA para Angola
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Controle as suas financas, crie orcamentos, acompanhe metas e receba
          conselhos inteligentes. Tudo adaptado a realidade angolana.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Comecar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Entrar
          </Link>
        </div>
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Seguro e privado
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            +10.000 utilizadores
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h3 className="text-center text-2xl font-bold tracking-tight">
            Tudo o que precisa para gerir as suas financas
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Funcionalidades desenhadas para a realidade financeira angolana.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-semibold">{f.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h3 className="text-center text-2xl font-bold tracking-tight">
            Planos e precos
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Comece gratis e faca upgrade quando precisar de mais.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl border p-6 ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card"
                }`}
              >
                <h4 className="font-semibold">{plan.name}</h4>
                <div className="mt-3">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
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
                  className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors ${
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

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          O Financeiro -- Gestao financeira para Angola e PALOP
        </div>
      </footer>
    </div>
  )
}
