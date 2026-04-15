import { PhoneFrame } from "./PhoneFrame"

const phones = [
  {
    src: "/screenshots-mobile/mobile-04-dashboard.png",
    alt: "Dashboard pessoal no telemóvel",
    caption: "Dashboard",
    desc: "Saldo total, património e últimas transacções",
  },
  {
    src: "/screenshots-mobile/mobile-52-chat-conversation.png",
    alt: "Conversa com o assistente no telemóvel",
    caption: "Assistente",
    desc: "Pergunte em português, receba respostas no momento",
  },
  {
    src: "/screenshots-mobile/mobile-05-transactions.png",
    alt: "Lista de transacções no telemóvel",
    caption: "Transacções",
    desc: "Registe despesas e receitas em segundos",
  },
]

export function MobileShowcase() {
  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
        <div className="max-w-xl mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            No telemóvel
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            A experiência completa no seu bolso
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tudo o que faz no computador, faz no telemóvel. Sem versão reduzida, sem
            funcionalidades bloqueadas.
          </p>
        </div>

        {/* Mobile: horizontal scroll-snap / Desktop: 3-col grid */}
        <div className="-mx-4 md:mx-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scrollbar-hide">
          <div className="flex gap-6 px-4 md:px-0 md:grid md:grid-cols-3 md:gap-10">
            {phones.map((p) => (
              <div
                key={p.caption}
                className="flex flex-col items-center snap-center shrink-0 w-[72vw] sm:w-[50vw] md:w-auto"
              >
                <PhoneFrame src={p.src} alt={p.alt} />
                <h3 className="mt-5 text-sm font-semibold">{p.caption}</h3>
                <p className="mt-1 text-xs text-muted-foreground text-center max-w-[220px]">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
