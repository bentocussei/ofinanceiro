import Link from "next/link"
import { ArrowRight, Check, User, Users } from "lucide-react"
import { PhoneFrame } from "./PhoneFrame"

const perspectives = [
  {
    icon: User,
    badge: "Pessoal",
    title: "O seu controlo financeiro individual",
    description:
      "Tudo o que precisa para gerir o seu dinheiro, sem misturar com mais ninguém.",
    bullets: [
      "Contas próprias — banco, carteira e poupança",
      "Orçamentos por categoria, com alertas",
      "Metas de poupança individuais",
      "Dívidas, simulação e plano de pagamento",
      "Investimentos e património pessoal",
    ],
    image: "/screenshots-mobile/mobile-04-dashboard.png",
    imageAlt: "Dashboard pessoal",
  },
  {
    icon: Users,
    badge: "Familiar",
    title: "Finanças partilhadas com quem importa",
    description:
      "Veja, oriente e cresça em conjunto — cada membro com a visibilidade certa.",
    bullets: [
      "Património familiar agregado",
      "Contas e despesas partilhadas",
      "Metas familiares em conjunto",
      "Membros com perfis: admin, adulto, criança",
      "Convites por código, sem fricção",
    ],
    image: "/screenshots-mobile/mobile-30-family-dashboard.png",
    imageAlt: "Dashboard familiar",
  },
] as const

export function PerspectiveCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      {perspectives.map((p) => {
        const Icon = p.icon
        return (
          <div
            key={p.badge}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
          >
            {/* Header strip with gradient hint of primary */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/[0.04] to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Contexto {p.badge}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.description}
              </p>
            </div>

            {/* Visual */}
            <div className="px-6 pb-2 pt-2 flex justify-center">
              <PhoneFrame
                src={p.image}
                alt={p.imageAlt}
                className="max-w-[200px] sm:max-w-[220px]"
              />
            </div>

            {/* Bullets */}
            <ul className="px-6 pb-6 pt-4 space-y-2.5">
              {p.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-sm text-foreground/90"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {/* Footer CTA */}
            <div className="mt-auto border-t border-border/60 bg-muted/30 px-6 py-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Começar com {p.badge.toLowerCase()}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
