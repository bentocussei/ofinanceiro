# O Financeiro

**A melhor app de gestão financeira pessoal e familiar com IA para Angola e PALOP.**

---

## Documentação

### Documentos Estratégicos e Técnicos

| # | Documento | Descrição |
|---|---|---|
| 00 | [Visão do Produto](docs/00_VISAO_PRODUTO.md) | O que é, para quem, proposta de valor, modelo de negócio, princípios |
| 01 | [Pesquisa de Mercado](docs/01_PESQUISA_MERCADO.md) | Análise competitiva, mercado Angola, oportunidades, dimensionamento |
| 02 | [Módulos e Funcionalidades](docs/02_MODULOS_FUNCIONALIDADES.md) | 13 módulos detalhados com todas as funcionalidades |
| 03 | [Arquitectura Técnica](docs/03_ARQUITECTURA_TECNICA.md) | Stack, estrutura, API, segurança, infraestrutura |
| 04 | [Arquitectura IA](docs/04_ARQUITECTURA_IA.md) | Multi-agente, skills, memória, function calling, insights |
| 07 | [Roadmap](docs/07_ROADMAP.md) | 7 fases de desenvolvimento, 40 semanas até lançamento |

### Diagramas (Mermaid)

| # | Diagrama | Descrição |
|---|---|---|
| 01 | [Arquitectura do Sistema](diagramas/01_arquitectura_sistema.mermaid) | Visão geral de todos os componentes |
| 02 | [Fluxo Multi-Agente](diagramas/02_fluxo_multi_agente.mermaid) | Como uma mensagem é processada (sequence diagram) |
| 03 | [Sistema de Memória](diagramas/03_sistema_memoria.mermaid) | 3 camadas de memória do assistente |
| 04 | [Modelo de Dados](diagramas/04_modelo_dados.mermaid) | Diagrama ER (PostgreSQL) |
| 05 | [Fluxo Onboarding](diagramas/05_fluxo_onboarding.mermaid) | Primeiro uso da app |

---

## Stack Técnico

| Camada | Tecnologia |
|---|---|
| Web | Next.js 15 + Tailwind CSS + Shadcn UI + Zustand |
| Mobile | React Native + Expo |
| Backend | FastAPI (Python 3.12) |
| Base de Dados | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| IA | Claude (Anthropic) + GPT-4o (OpenAI) + Gemini (Google) |
| Hosting | Railway/Render (backend) + Vercel (web) |

---

## Arranque Rápido (Desenvolvimento)

```bash
# Clone
git clone <repo-url>
cd o-financeiro

# Backend
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env com credenciais

# Docker (PostgreSQL + Redis)
docker compose up -d

# Correr API
uvicorn app.main:app --reload

# Web (noutra terminal)
cd apps/web
npm install
npm run dev

# Mobile (noutra terminal)
cd apps/mobile
npm install
npx expo start
```
