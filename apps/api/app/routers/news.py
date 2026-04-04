"""News router: financial news feed, exchange rates, and AI-ready endpoints."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/news", tags=["news"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ExchangeRateItem(BaseModel):
    currency: str
    buy: float
    sell: float
    source: str
    updated_at: str


class ExchangeRatesResponse(BaseModel):
    base: str
    rates: list[ExchangeRateItem]
    source: str
    date: str


class NewsArticle(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    category: str
    published_at: str
    url: str


class MarketSummaryResponse(BaseModel):
    summary: str
    highlights: list[str]
    sentiment: str
    ai_generated: bool


class ImpactItem(BaseModel):
    news_id: str
    title: str
    impact: str
    impact_type: str  # positive, negative, neutral
    recommendation: str


class ImpactAnalysisResponse(BaseModel):
    analyses: list[ImpactItem]
    ai_generated: bool


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    ai_generated: bool


# ---------------------------------------------------------------------------
# Hardcoded data — will be replaced by real sources (BNA API, RSS, AI)
# ---------------------------------------------------------------------------

TODAY = date.today().isoformat()


def _exchange_rates() -> list[ExchangeRateItem]:
    """Hardcoded but realistic Angola exchange rates."""
    return [
        ExchangeRateItem(currency="USD", buy=825.00, sell=835.00, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="EUR", buy=895.00, sell=910.00, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="BRL", buy=155.00, sell=162.00, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="ZAR", buy=44.00, sell=47.00, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="MZN", buy=12.80, sell=13.50, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="CVE", buy=8.10, sell=8.50, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="GBP", buy=1040.00, sell=1060.00, source="BNA", updated_at=TODAY),
        ExchangeRateItem(currency="CNY", buy=113.00, sell=118.00, source="BNA", updated_at=TODAY),
    ]


def _news_articles() -> list[NewsArticle]:
    """20+ hardcoded articles spread across the last 30 days."""
    base = date.today()
    articles = [
        NewsArticle(
            id="1",
            title="BNA mantém taxa de juro de referência em 19,5%",
            summary="O Banco Nacional de Angola decidiu manter a taxa básica de juro inalterada na reunião do Comité de Política Monetária. A decisão reflecte a necessidade de continuar a combater a inflação enquanto se apoia o crescimento económico.",
            source="BNA",
            category="Economia",
            published_at=(base - timedelta(days=0)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="2",
            title="Inflação em Angola recua para 24% em Março 2026",
            summary="O Instituto Nacional de Estatística reportou uma descida da taxa de inflação homóloga para 24%, o valor mais baixo em dois anos. Os analistas apontam a estabilidade cambial como factor determinante para esta trajectória descendente.",
            source="INE Angola",
            category="Economia",
            published_at=(base - timedelta(days=1)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="3",
            title="BAI lança nova plataforma de investimentos digitais",
            summary="O Banco Angolano de Investimentos apresentou uma plataforma digital que permite aos clientes investir em obrigações do tesouro e fundos de investimento directamente pelo telemóvel. O investimento mínimo é de 50.000 Kz.",
            source="BAI",
            category="Banca",
            published_at=(base - timedelta(days=2)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="4",
            title="Governo aprova novo código de investimento privado",
            summary="O Conselho de Ministros aprovou o novo Código de Investimento Privado que simplifica procedimentos e reduz burocracias para investidores. O diploma prevê incentivos fiscais para sectores prioritários como agricultura e tecnologia.",
            source="Jornal de Angola",
            category="Investimentos",
            published_at=(base - timedelta(days=3)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="5",
            title="Preço do petróleo Brent sobe para $85 o barril",
            summary="O preço do barril de petróleo Brent atingiu os $85, beneficiando as receitas fiscais de Angola. O país continua dependente das exportações petrolíferas que representam cerca de 90% das receitas em divisas.",
            source="Reuters",
            category="Internacional",
            published_at=(base - timedelta(days=3)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="6",
            title="Kwanza estabiliza face ao dólar no mercado informal",
            summary="A taxa de câmbio do Kwanza no mercado paralelo aproximou-se da taxa oficial, com o dólar a ser transaccionado abaixo dos 900 Kz. Esta convergência é vista como sinal positivo pelos economistas.",
            source="Expansão",
            category="Economia",
            published_at=(base - timedelta(days=4)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="7",
            title="Novas regras para transferências internacionais entram em vigor",
            summary="O BNA publicou novas regulamentações para transferências internacionais que simplificam o processo para valores até $10.000. As novas regras visam facilitar as remessas da diáspora angolana.",
            source="BNA",
            category="Banca",
            published_at=(base - timedelta(days=5)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="8",
            title="BFA oferece depósitos a prazo com 12% de retorno anual",
            summary="O Banco de Fomento Angola lançou uma campanha de depósitos a prazo com taxa de juro de 12% ao ano para prazos de 12 meses. A oferta está disponível para montantes a partir de 100.000 Kz.",
            source="BFA",
            category="Banca",
            published_at=(base - timedelta(days=6)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="9",
            title="Angola adere ao sistema de pagamentos regional SADC",
            summary="Angola formalizou a sua adesão ao sistema integrado de pagamentos da SADC, permitindo transferências directas entre países da região. O sistema reduzirá custos e tempo de processamento de pagamentos transfronteiriços.",
            source="SADC",
            category="Internacional",
            published_at=(base - timedelta(days=7)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="10",
            title="Sector imobiliário em Luanda mostra sinais de recuperação",
            summary="O mercado imobiliário de Luanda registou um aumento de 15% nas transacções no primeiro trimestre de 2026. A estabilidade económica e novas linhas de crédito habitação impulsionaram a procura.",
            source="Expansão",
            category="Investimentos",
            published_at=(base - timedelta(days=8)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="11",
            title="AGT anuncia período de regularização fiscal voluntária",
            summary="A Administração Geral Tributária abriu um período especial de regularização fiscal até Junho de 2026, com redução de 50% nas multas. A medida visa alargar a base tributária e incentivar a formalização económica.",
            source="AGT",
            category="Impostos",
            published_at=(base - timedelta(days=9)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="12",
            title="Multicaixa Express atinge 5 milhões de utilizadores",
            summary="O serviço de pagamentos móveis Multicaixa Express ultrapassou a marca de 5 milhões de utilizadores activos. O crescimento reflecte a rápida adopção de serviços financeiros digitais em Angola.",
            source="EMIS",
            category="Tecnologia",
            published_at=(base - timedelta(days=10)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="13",
            title="Preços dos alimentos estabilizam em Luanda",
            summary="O cabaz básico de alimentos em Luanda manteve-se estável pelo terceiro mês consecutivo, segundo dados do INE. A melhoria na produção agrícola nacional contribuiu para a contenção dos preços.",
            source="INE Angola",
            category="Pessoal",
            published_at=(base - timedelta(days=11)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="14",
            title="Novo imposto sobre rendimentos de capital entra em vigor em Julho",
            summary="A partir de Julho de 2026, os rendimentos de capital passam a ser tributados a uma taxa uniforme de 15%. A medida afecta juros de depósitos, dividendos e mais-valias de investimentos.",
            source="AGT",
            category="Impostos",
            published_at=(base - timedelta(days=13)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="15",
            title="Standard Bank Angola lança crédito pessoal digital",
            summary="O Standard Bank Angola disponibilizou crédito pessoal 100% digital com aprovação em 24 horas. Os montantes variam entre 100.000 Kz e 5.000.000 Kz com prazos até 48 meses.",
            source="Standard Bank",
            category="Banca",
            published_at=(base - timedelta(days=14)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="16",
            title="Reservas internacionais de Angola sobem para $15 mil milhões",
            summary="As reservas internacionais líquidas de Angola atingiram $15 mil milhões, o nível mais alto desde 2015. O aumento deve-se às receitas petrolíferas e à disciplina na gestão cambial.",
            source="BNA",
            category="Economia",
            published_at=(base - timedelta(days=16)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="17",
            title="FMI elogia reformas económicas de Angola",
            summary="O Fundo Monetário Internacional publicou um relatório positivo sobre as reformas económicas em Angola, destacando a consolidação fiscal e a diversificação económica. O FMI projecta um crescimento de 3,2% para 2026.",
            source="FMI",
            category="Internacional",
            published_at=(base - timedelta(days=18)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="18",
            title="Startup angolana de fintech capta $2 milhões em investimento",
            summary="A Payex, startup angolana de pagamentos digitais, captou $2 milhões numa ronda de investimento liderada por investidores sul-africanos. A empresa planeia expandir os seus serviços para outras províncias.",
            source="Expansão",
            category="Tecnologia",
            published_at=(base - timedelta(days=20)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="19",
            title="Governo reduz IVA sobre produtos da cesta básica",
            summary="O Executivo aprovou a redução da taxa de IVA de 14% para 7% sobre 30 produtos da cesta básica. A medida visa aliviar o custo de vida das famílias angolanas e entra em vigor em Abril.",
            source="Jornal de Angola",
            category="Impostos",
            published_at=(base - timedelta(days=22)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="20",
            title="Bolsa de Dívida e Valores de Angola prepara lançamento de acções",
            summary="A BODIVA anunciou planos para permitir a negociação de acções de empresas angolanas ainda em 2026. Três empresas já manifestaram interesse em realizar ofertas públicas iniciais.",
            source="BODIVA",
            category="Investimentos",
            published_at=(base - timedelta(days=24)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="21",
            title="Dicas para poupar com o regresso às aulas em Angola",
            summary="Com o início do ano lectivo a aproximar-se, especialistas recomendam planear antecipadamente as despesas com material escolar e propinas. Comparar preços entre fornecedores pode gerar poupanças de até 30%.",
            source="O Financeiro",
            category="Pessoal",
            published_at=(base - timedelta(days=25)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="22",
            title="Angola e Moçambique assinam acordo de cooperação bancária",
            summary="Os bancos centrais de Angola e Moçambique assinaram um memorando de entendimento para facilitar transacções financeiras entre os dois países. O acordo beneficiará comunidades empresariais e a diáspora.",
            source="BNA",
            category="Internacional",
            published_at=(base - timedelta(days=27)).isoformat(),
            url="#",
        ),
        NewsArticle(
            id="23",
            title="Como criar um fundo de emergência com 50.000 Kz por mês",
            summary="Especialistas financeiros explicam que, reservando 50.000 Kz mensais, é possível constituir um fundo de emergência equivalente a 3 meses de despesas em aproximadamente um ano. A disciplina e a automatização são fundamentais.",
            source="O Financeiro",
            category="Pessoal",
            published_at=(base - timedelta(days=29)).isoformat(),
            url="#",
        ),
    ]
    return articles


def _market_summary() -> MarketSummaryResponse:
    """Hardcoded market summary — will be AI-generated."""
    return MarketSummaryResponse(
        summary=(
            "O mercado angolano mantém-se estável com o Kwanza a consolidar ganhos "
            "face ao dólar. A inflação continua em trajectória descendente, tendo recuado "
            "para 24% em termos homólogos. O preço do petróleo Brent acima dos $85 por "
            "barril sustenta as receitas fiscais e as reservas internacionais, que atingiram "
            "o nível mais alto desde 2015. O sector bancário apresenta novas oportunidades "
            "de investimento com taxas de depósito a prazo competitivas."
        ),
        highlights=[
            "BNA mantém taxa de referência em 19,5%",
            "Petróleo Brent acima dos $85 por barril",
            "Inflação recua para 24% — mínimo de dois anos",
            "Reservas internacionais sobem para $15 mil milhões",
            "Multicaixa Express ultrapassa 5 milhões de utilizadores",
        ],
        sentiment="neutral",
        ai_generated=False,
    )


def _impact_analysis() -> list[ImpactItem]:
    """Hardcoded impact analysis — will be AI-generated per user."""
    return [
        ImpactItem(
            news_id="2",
            title="Inflação recua para 24%",
            impact="As suas poupanças perdem menos valor real. O poder de compra está a estabilizar gradualmente.",
            impact_type="positive",
            recommendation="Bom momento para aumentar contribuições para metas de poupança.",
        ),
        ImpactItem(
            news_id="5",
            title="Petróleo Brent sobe para $85",
            impact="Receitas fiscais mais fortes significam menor pressão sobre o câmbio. O Kwanza tende a manter-se estável.",
            impact_type="positive",
            recommendation="Considere manter poupanças em Kwanza — a tendência cambial é favorável.",
        ),
        ImpactItem(
            news_id="14",
            title="Novo imposto sobre rendimentos de capital",
            impact="Os juros dos seus depósitos a prazo passarão a ser tributados a 15% a partir de Julho.",
            impact_type="negative",
            recommendation="Reveja os seus investimentos antes de Julho e considere alternativas com benefícios fiscais.",
        ),
        ImpactItem(
            news_id="19",
            title="Redução do IVA sobre cesta básica",
            impact="As suas despesas mensais com alimentação poderão diminuir ligeiramente a partir de Abril.",
            impact_type="positive",
            recommendation="Reajuste o seu orçamento de alimentação para reflectir a poupança esperada.",
        ),
        ImpactItem(
            news_id="8",
            title="BFA oferece 12% em depósitos a prazo",
            impact="Existe uma oportunidade de obter melhor retorno nas suas poupanças comparado à média do mercado.",
            impact_type="positive",
            recommendation="Compare esta oferta com o retorno actual das suas poupanças e considere diversificar.",
        ),
    ]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[NewsArticle])
async def get_news_feed(
    category: str | None = Query(None, description="Filtrar por categoria"),
    limit: int = Query(20, ge=1, le=50, description="Número máximo de artigos"),
    user: User = Depends(get_current_user),
) -> list[NewsArticle]:
    """Get curated financial news for Angola/PALOP.

    In production, this would fetch from RSS feeds, BNA, Jornal de Angola, etc.
    Supports filtering by category and limiting results.
    """
    articles = _news_articles()

    if category:
        articles = [a for a in articles if a.category.lower() == category.lower()]

    # Already sorted by published_at desc (newest first)
    return articles[:limit]


@router.get("/exchange-rates", response_model=ExchangeRatesResponse)
async def get_exchange_rates(
    user: User = Depends(get_current_user),
) -> ExchangeRatesResponse:
    """Get current exchange rates (BNA official).

    In production, would fetch from BNA API or scrape official rates.
    """
    return ExchangeRatesResponse(
        base="AOA",
        rates=_exchange_rates(),
        source="BNA",
        date=TODAY,
    )


@router.get("/market-summary", response_model=MarketSummaryResponse)
async def get_market_summary(
    user: User = Depends(get_current_user),
) -> MarketSummaryResponse:
    """AI-generated market summary for Angola.

    In production, the AI agent will analyse recent news and market data
    to generate a personalised daily summary.
    """
    return _market_summary()


@router.get("/impact-analysis", response_model=ImpactAnalysisResponse)
async def get_impact_analysis(
    user: User = Depends(get_current_user),
) -> ImpactAnalysisResponse:
    """AI-generated analysis of how current news affects the user's finances.

    In production, the News AI agent will cross-reference current news with
    the user's financial profile (accounts, goals, investments) to generate
    personalised impact assessments.
    """
    return ImpactAnalysisResponse(
        analyses=_impact_analysis(),
        ai_generated=False,
    )


@router.post("/ask", response_model=AskResponse)
async def ask_about_news(
    request: AskRequest,
    user: User = Depends(get_current_user),
) -> AskResponse:
    """Ask AI about financial news and market conditions.

    In production, the News AI agent will use RAG over recent news articles
    and market data to answer user questions in context.
    """
    return AskResponse(
        answer="Esta funcionalidade estará disponível em breve. O assistente de IA irá responder a perguntas sobre notícias financeiras e condições de mercado.",
        ai_generated=False,
    )
