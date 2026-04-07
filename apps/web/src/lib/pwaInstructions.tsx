import { Menu, Plus, Share, MoreVertical } from "lucide-react"
import type { ReactNode } from "react"
import type { BrowserKind } from "./usePWAInstall"

interface Step {
  text: ReactNode
}

interface BrowserInstructions {
  /** Display label of the detected browser, e.g. "Safari" or "Chrome (iOS)". */
  label: string
  /** Step-by-step manual instructions for adding to home screen. */
  steps: Step[]
}

/**
 * Returns the human-readable label and manual install steps for the
 * detected browser. Used when programmatic install is unavailable.
 */
export function getBrowserInstructions(browser: BrowserKind): BrowserInstructions {
  switch (browser) {
    case "safari":
      return {
        label: "Safari",
        steps: [
          {
            text: (
              <>
                Toque no botão de partilhar
                <Share className="inline-block h-4 w-4 mx-1 text-blue-500" aria-label="Partilhar" />
                na barra inferior do Safari
              </>
            ),
          },
          {
            text: (
              <>
                Deslize para baixo e escolha
                <Plus className="inline-block h-4 w-4 mx-1" aria-label="Adicionar" />
                <span className="font-medium text-foreground">Adicionar ao ecrã principal</span>
              </>
            ),
          },
          {
            text: (
              <>
                Confirme tocando em <span className="font-medium text-foreground">Adicionar</span>
              </>
            ),
          },
        ],
      }

    case "ios-chrome":
      return {
        label: "Chrome (iOS)",
        steps: [
          {
            text: (
              <>
                Toque no botão de partilhar
                <Share className="inline-block h-4 w-4 mx-1 text-blue-500" aria-label="Partilhar" />
                no canto superior direito do Chrome
              </>
            ),
          },
          {
            text: (
              <>
                Escolha
                <Plus className="inline-block h-4 w-4 mx-1" aria-label="Adicionar" />
                <span className="font-medium text-foreground">Adicionar ao ecrã principal</span>
              </>
            ),
          },
          {
            text: (
              <>
                Confirme tocando em <span className="font-medium text-foreground">Adicionar</span>
              </>
            ),
          },
        ],
      }

    case "ios-firefox":
      return {
        label: "Firefox (iOS)",
        steps: [
          {
            text: (
              <>
                Toque no menu
                <Menu className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                no canto inferior direito
              </>
            ),
          },
          {
            text: (
              <>
                Escolha <span className="font-medium text-foreground">Partilhar</span>, depois{" "}
                <span className="font-medium text-foreground">Adicionar ao ecrã principal</span>
              </>
            ),
          },
          { text: <>Confirme a adição</> },
        ],
      }

    case "firefox":
      return {
        label: "Firefox",
        steps: [
          {
            text: (
              <>
                Abra o menu
                <Menu className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                no canto superior direito
              </>
            ),
          },
          {
            text: (
              <>
                Escolha{" "}
                <span className="font-medium text-foreground">Instalar</span> ou{" "}
                <span className="font-medium text-foreground">Adicionar à página inicial</span>
              </>
            ),
          },
          { text: <>Confirme a instalação</> },
        ],
      }

    case "samsung":
      return {
        label: "Samsung Internet",
        steps: [
          {
            text: (
              <>
                Toque no menu
                <Menu className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                na parte inferior do ecrã
              </>
            ),
          },
          {
            text: (
              <>
                Escolha{" "}
                <span className="font-medium text-foreground">Adicionar página a</span>, depois{" "}
                <span className="font-medium text-foreground">Ecrã inicial</span>
              </>
            ),
          },
          { text: <>Confirme a adição</> },
        ],
      }

    case "edge":
      return {
        label: "Edge",
        steps: [
          {
            text: (
              <>
                Abra o menu
                <MoreVertical className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                no canto superior direito
              </>
            ),
          },
          {
            text: (
              <>
                Escolha <span className="font-medium text-foreground">Aplicações</span> →{" "}
                <span className="font-medium text-foreground">Instalar este site como aplicação</span>
              </>
            ),
          },
          { text: <>Confirme a instalação</> },
        ],
      }

    case "opera":
      return {
        label: "Opera",
        steps: [
          {
            text: (
              <>
                Abra o menu
                <Menu className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                do Opera
              </>
            ),
          },
          {
            text: (
              <>
                Escolha{" "}
                <span className="font-medium text-foreground">Adicionar ao ecrã inicial</span> ou{" "}
                <span className="font-medium text-foreground">Instalar</span>
              </>
            ),
          },
          { text: <>Confirme a instalação</> },
        ],
      }

    case "chrome":
    default:
      return {
        label: "Chrome",
        steps: [
          {
            text: (
              <>
                Abra o menu
                <MoreVertical className="inline-block h-4 w-4 mx-1" aria-label="Menu" />
                do Chrome (canto superior direito)
              </>
            ),
          },
          {
            text: (
              <>
                Escolha{" "}
                <span className="font-medium text-foreground">Instalar app</span> ou{" "}
                <span className="font-medium text-foreground">Adicionar ao ecrã inicial</span>
              </>
            ),
          },
          { text: <>Confirme a instalação</> },
        ],
      }
  }
}
