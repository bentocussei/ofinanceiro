import type { MetadataRoute } from "next"

const ENV_LABEL = process.env.NEXT_PUBLIC_APP_ENV_LABEL?.trim() || ""
const APP_NAME = ENV_LABEL ? `O Financeiro (${ENV_LABEL})` : "O Financeiro"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description:
      "Gestão financeira pessoal e familiar para Angola",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F0F0F",
    theme_color: "#0D9488",
    lang: "pt-AO",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "productivity"],
  }
}
