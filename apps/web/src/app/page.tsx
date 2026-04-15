import Link from "next/link"
import { DeviceShowcase } from "@/components/landing/DeviceShowcase"
import { PerspectiveCards } from "@/components/landing/PerspectiveCards"
import { PhoneFrame } from "@/components/landing/PhoneFrame"
import { StickyCTA } from "@/components/landing/StickyCTA"
import { ThemeToggle } from "@/components/landing/ThemeToggle"
import { LogoFull } from "@/components/Logo"
import { LandingFeedback } from "@/components/feedback/LandingFeedback"
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  PiggyBank,
  Receipt,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

const features = [
  {
    icon: Eye,
    title: "Tudo num só lugar",
    description:
      "Junte todas as contas bancárias, carteira, poupanças e investimentos. Veja exactamente quanto tem e para onde vai.",
  },
  {
    icon: PiggyBank,
    title: "Orçamentos inteligentes",
    description:
      "5 métodos de orçamento. Alertas antes de ultrapassar. Rollover automático para o mês seguinte.",
  },
  {
    icon: Target,
    title: "Metas de poupança",
    description:
      "Defina objectivos, contribua regularmente, acompanhe o progresso. O dinheiro é rastreado até ao Kwanza.",
  },
  {
    icon: Users,
    title: "Finanças familiares",
    description:
      "Contas partilhadas, orçamento familiar, metas em conjunto. Cada membro vê o que lhe compete.",
  },
  {
    icon: TrendingUp,
    title: "Investimentos e património",
    description:
      "Acompanhe depósitos, obrigações, imóveis e veículos. Veja o seu património líquido real.",
  },
  {
    icon: CreditCard,
    title: "Dívidas sob controlo",
    description:
      "Registe empréstimos, simule amortização, pague de forma estratégica. Veja o caminho até ficar livre.",
  },
  {
    icon: BarChart3,
    title: "Relatórios detalhados",
    description:
      "Gráficos de receitas vs despesas, gastos por categoria, evolução mensal. Dados reais, não suposições.",
  },
  {
    icon: Receipt,
    title: "Contas e recibos",
    description:
      "Fotografe recibos e os dados são extraídos automaticamente. Registe contas a pagar com lembretes.",
  },
  {
    icon: Zap,
    title: "Assistente pessoal",
    description:
      "Pergunte sobre as suas finanças em linguagem natural. Receba sugestões personalizadas todos os dias.",
  },
]

const plans = [
  {
    name: "Pessoal",
    price: "1.990",
    suffix: "Kz/mês",
    description: "Controlo total das suas finanças",
    features: [
      "Contas e transacções ilimitadas",
      "Assistente pessoal completo",
      "Fotografar recibos automaticamente",
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
    price: "4.990",
    suffix: "Kz/mês",
    description: "Gestão financeira para toda a família",
    features: [
      "Tudo do Pessoal",
      "Até 5 membros incluídos",
      "Contas e orçamentos partilhados",
      "Metas familiares em conjunto",
      "Divisão de despesas inteligente",
      "Relatórios por membro",
      "Membros extra: +990 Kz/mês cada",
    ],
    cta: "Começar 90 dias grátis",
    href: "/register",
    highlighted: false,
  },
]

const stats = [
  { value: "15+", label: "Módulos financeiros" },
  { value: "Pessoal", label: "e Familiar" },
  { value: "0 Kz", label: "Primeiros 90 dias" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex items-center justify-between px-4 md:px-8 py-3 max-w-[1600px]">
          <a href="/"><LogoFull className="h-9 md:h-12" /></a>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#funcionalidades" className="text-muted-foreground transition-colors hover:text-foreground">
              Funcionalidades
            </a>
            <a href="#plataforma" className="text-muted-foreground transition-colors hover:text-foreground">
              Plataforma
            </a>
            <a href="#precos" className="text-muted-foreground transition-colors hover:text-foreground">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-md bg-primary px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Começar<span className="hidden sm:inline"> grátis</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-[calc(5rem+env(safe-area-inset-top))] md:pt-28 pb-12 md:pb-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Saiba exactamente para onde vai cada{" "}
                <span className="text-primary">Kwanza</span>
              </h1>

              <p className="mt-5 md:mt-6 max-w-xl text-base md:text-lg leading-relaxed text-muted-foreground">
                A plataforma de gestão financeira pessoal e familiar mais completa de Angola.
                Contas, orçamentos, metas, investimentos, património — tudo num só lugar.
              </p>

              <div className="mt-7 md:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 md:px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_2px_12px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_4px_20px_rgba(21,128,61,0.35)]"
                >
                  Começar 90 dias grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-6 md:px-8 py-3.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Já tenho conta
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-10 md:mt-12 grid grid-cols-3 gap-4 md:gap-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-bold font-mono text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — desktop browser mockup (lg+) */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border/50 bg-card shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-[10px] text-muted-foreground">ofinanceiro.ao</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/dashboard.png"
                  alt="O Financeiro — Dashboard"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Mobile phone mockup — below the CTA on <lg */}
          <div className="lg:hidden mt-12 flex justify-center">
            <PhoneFrame
              src="/screenshots-mobile/mobile-04-dashboard.png"
              alt="O Financeiro no telemóvel"
              priority
              className="max-w-[240px]"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-14 md:py-20">
        <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="max-w-xl mb-10 md:mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo o que precisa para controlar as suas finanças
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pensado para a forma como os angolanos gerem o dinheiro no dia-a-dia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group flex flex-col gap-2.5 rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] sm:flex-row sm:gap-4 sm:p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
                    <Icon className="h-[18px] w-[18px] text-primary sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{f.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3 sm:line-clamp-none sm:text-sm">
                      {f.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Device showcase — Telemóvel + Computador tabs */}
      <DeviceShowcase />

      {/* Context perspectives — Pessoal + Familiar */}
      <section id="plataforma" className="border-t border-border bg-muted/30 py-14 md:py-20">
        <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="max-w-xl mb-10 md:mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Contextos
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Uma plataforma, duas perspectivas
            </h2>
            <p className="mt-3 text-muted-foreground">
              Finanças pessoais e familiares em contextos separados. Mude entre eles com
              um clique.
            </p>
          </div>

          <PerspectiveCards />
        </div>
      </section>

      {/* Video Demo */}
      <section className="py-14 md:py-20">
        <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Demonstração
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Simples de usar, poderoso nos resultados
              </h2>
              <p className="mt-3 text-muted-foreground">
                Navegue pelo dashboard, registe transacções, acompanhe metas e veja relatórios — tudo em poucos cliques.
              </p>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-border/50 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                <video
                  controls
                  className="w-full"
                  poster="/screenshots/dashboard.png"
                  preload="metadata"
                >
                  <source src="/videos/demo-navigation.webm" type="video/webm" />
                  O seu browser não suporta vídeo.
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="border-t border-border bg-muted/30 py-14 md:py-20">
        <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="max-w-xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Preços
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Planos simples e acessíveis
            </h2>
            <p className="mt-3 text-muted-foreground">
              Acesso completo desde o primeiro dia. 90 dias grátis para novos utilizadores.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
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
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="font-mono text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">{plan.suffix}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_8px_rgba(21,128,61,0.2)]"
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
      <section className="py-14 md:py-20">
        <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Comece a controlar as suas finanças hoje
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-lg">
                90 dias grátis. Sem cartão de crédito. Sem compromisso.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 md:px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_2px_12px_rgba(21,128,61,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_4px_20px_rgba(21,128,61,0.35)]"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Registe-se em menos de 1 minuto</p>
                      <p className="text-xs text-muted-foreground">Só precisa do número de telefone</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Adicione as suas contas</p>
                      <p className="text-xs text-muted-foreground">Bancárias, carteira, poupança — tudo junto</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tenha clareza total</p>
                      <p className="text-xs text-muted-foreground">Saiba para onde vai cada Kwanza, todos os dias</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <LandingFeedback />

      {/* Mobile-only sticky CTA bar */}
      <StickyCTA />

      {/* Footer */}
      <footer className="border-t border-border py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex flex-col items-center justify-between gap-3 px-4 md:px-8 text-sm text-muted-foreground sm:flex-row max-w-[1600px]">
          <LogoFull className="h-12" />
          <p>Gestão financeira pessoal e familiar para Angola</p>
          <p className="text-xs text-muted-foreground/60">Powered by Magiflex</p>
        </div>
      </footer>
    </div>
  )
}
