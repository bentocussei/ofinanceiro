"""Education router: daily tips, challenges, badges, streaks, learning paths, achievements."""

import random
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/education", tags=["education"])

# ---------------------------------------------------------------------------
# Hardcoded content — will be replaced by AI-generated content later
# ---------------------------------------------------------------------------

DAILY_TIPS = [
    # Orçamento
    {"id": "1", "title": "Regra dos 50/30/20", "content": "Tente dividir o rendimento: 50% necessidades, 30% desejos, 20% poupança.", "category": "Orçamento"},
    {"id": "2", "title": "Orçamento base zero", "content": "Atribua cada Kwanza do salário a uma categoria. Dinheiro sem destino acaba gasto.", "category": "Orçamento"},
    {"id": "3", "title": "Reveja o orçamento semanalmente", "content": "Dedique 15 minutos ao domingo para ver se está dentro dos limites.", "category": "Orçamento"},
    {"id": "4", "title": "Use envelopes digitais", "content": "Separe o dinheiro por categorias, mesmo que seja em contas diferentes.", "category": "Orçamento"},
    {"id": "5", "title": "Priorize despesas fixas", "content": "Pague renda, ENDE, EPAL e escola primeiro. O resto é flexível.", "category": "Orçamento"},
    # Poupança
    {"id": "6", "title": "Fundo de emergência", "content": "Guarde pelo menos 3 meses de despesas para emergências.", "category": "Poupança"},
    {"id": "7", "title": "Automatize as poupanças", "content": "Configure uma transferência automática no dia do salário para a conta poupança.", "category": "Poupança"},
    {"id": "8", "title": "A regra 72", "content": "Divida 72 pela taxa de juro para saber em quantos anos o dinheiro duplica.", "category": "Poupança"},
    {"id": "9", "title": "Pague-se primeiro", "content": "Antes de pagar qualquer conta, separe pelo menos 10% para poupança.", "category": "Poupança"},
    {"id": "10", "title": "Poupe as moedas", "content": "Guarde todo o troco num frasco. Ao fim do mês vai surpreender-se.", "category": "Poupança"},
    # Investimento
    {"id": "11", "title": "Diversifique", "content": "Não coloque todas as economias num só banco ou produto financeiro.", "category": "Investimento"},
    {"id": "12", "title": "Comece cedo", "content": "Os juros compostos recompensam quem começa a investir mais cedo.", "category": "Investimento"},
    {"id": "13", "title": "Conheça o risco", "content": "Antes de investir, perceba o nível de risco. Maior retorno = maior risco.", "category": "Investimento"},
    {"id": "14", "title": "Obrigações do tesouro", "content": "Os bilhetes e obrigações do tesouro angolano são opções de baixo risco.", "category": "Investimento"},
    # Dívidas
    {"id": "15", "title": "Pague a dívida mais cara primeiro", "content": "Concentre pagamentos extra na dívida com maior taxa de juro.", "category": "Dívidas"},
    {"id": "16", "title": "Bola de neve de dívidas", "content": "Outra estratégia: pague a menor dívida primeiro para ganhar motivação.", "category": "Dívidas"},
    {"id": "17", "title": "Evite dívidas de consumo", "content": "Cartões de crédito e empréstimos para férias custam muito em juros.", "category": "Dívidas"},
    {"id": "18", "title": "Renegoceie condições", "content": "Fale com o banco sobre reestruturar dívidas se estiver com dificuldades.", "category": "Dívidas"},
    # Família
    {"id": "19", "title": "Ensine finanças aos filhos", "content": "Dê-lhes mesada e ajude-os a orçamentar. É a melhor escola financeira.", "category": "Família"},
    {"id": "20", "title": "Orçamento familiar conjunto", "content": "Marido e mulher devem planear as finanças juntos, sem segredos.", "category": "Família"},
    {"id": "21", "title": "Defina metas familiares", "content": "Uma meta partilhada (casa, carro, férias) motiva toda a família a poupar.", "category": "Família"},
    {"id": "22", "title": "Seguro de vida", "content": "Se tem família que depende de si, considere um seguro de vida.", "category": "Família"},
    # Hábitos
    {"id": "23", "title": "Compras por impulso", "content": "Espere 24h antes de comprar algo não essencial acima de 10.000 Kz.", "category": "Hábitos"},
    {"id": "24", "title": "Registe cada despesa", "content": "Quanto mais registar, melhor entende para onde vai o dinheiro.", "category": "Hábitos"},
    {"id": "25", "title": "Leve lista ao mercado", "content": "Ir ao mercado sem lista é garantia de gastar mais do que devia.", "category": "Hábitos"},
    {"id": "26", "title": "Reveja subscrições", "content": "Verifique serviços que paga mensalmente. Está a usar todos?", "category": "Hábitos"},
    {"id": "27", "title": "Compare preços", "content": "Antes de comprar, veja pelo menos 3 opções diferentes.", "category": "Hábitos"},
    # Angola-específico
    {"id": "28", "title": "Negoceie preços", "content": "Em Angola, muitos preços são negociáveis. Não tenha vergonha de pedir desconto.", "category": "Angola"},
    {"id": "29", "title": "Kixikila com propósito", "content": "Use esquemas informais de poupança (kixikila) para objectivos concretos.", "category": "Angola"},
    {"id": "30", "title": "Renegociar contratos", "content": "ENDE, EPAL, internet — compare preços e renegoceie anualmente.", "category": "Angola"},
    {"id": "31", "title": "Dólar e Kwanza", "content": "Mantenha poupanças em moedas diferentes para proteger contra a desvalorização.", "category": "Angola"},
    {"id": "32", "title": "Cuidado com o câmbio informal", "content": "O câmbio paralelo tem riscos. Use sempre canais legais quando possível.", "category": "Angola"},
    {"id": "33", "title": "Compre no produtor", "content": "Frutas e legumes directamente do produtor podem custar metade do preço.", "category": "Angola"},
]

CHALLENGES = [
    # Fácil (25-50 XP)
    {"id": "1", "title": "Dia sem gastar", "description": "Não gaste nada durante 24 horas.", "xp": 25, "difficulty": "Fácil"},
    {"id": "2", "title": "Registe 3 despesas", "description": "Registe pelo menos 3 despesas hoje no O Financeiro.", "xp": 25, "difficulty": "Fácil"},
    {"id": "3", "title": "Semana sem Uber", "description": "Use candongueiro durante 7 dias e veja quanto poupa.", "xp": 50, "difficulty": "Fácil"},
    {"id": "4", "title": "Auditoria de subscrições", "description": "Reveja e cancele pelo menos 1 serviço que não usa.", "xp": 50, "difficulty": "Fácil"},
    {"id": "5", "title": "Lista de compras", "description": "Vá ao mercado com lista e não compre nada fora dela.", "xp": 25, "difficulty": "Fácil"},
    {"id": "6", "title": "Defina uma meta", "description": "Crie uma meta de poupança no O Financeiro.", "xp": 50, "difficulty": "Fácil"},
    # Médio (75-100 XP)
    {"id": "7", "title": "Cozinhar em casa", "description": "Prepare todas as refeições em casa durante 5 dias.", "xp": 75, "difficulty": "Médio"},
    {"id": "8", "title": "Semana de refeições em casa", "description": "Não coma fora durante 7 dias consecutivos.", "xp": 100, "difficulty": "Médio"},
    {"id": "9", "title": "Orçamento zero", "description": "Atribua cada Kwanza do salário a uma categoria.", "xp": 100, "difficulty": "Médio"},
    {"id": "10", "title": "Compare 3 preços", "description": "Antes de uma compra grande, compare preços em 3 lojas.", "xp": 75, "difficulty": "Médio"},
    {"id": "11", "title": "Semana sem gastos extras", "description": "Passe 7 dias gastando apenas em necessidades básicas.", "xp": 100, "difficulty": "Médio"},
    {"id": "12", "title": "Renegoceie um contrato", "description": "Ligue para ENDE, EPAL ou operadora e peça melhor preço.", "xp": 75, "difficulty": "Médio"},
    # Difícil (150-200 XP)
    {"id": "13", "title": "30 dias de registo", "description": "Registe todas as despesas durante 30 dias consecutivos.", "xp": 200, "difficulty": "Difícil"},
    {"id": "14", "title": "Criar fundo de emergência", "description": "Poupe pelo menos 50.000 Kz para emergências.", "xp": 200, "difficulty": "Difícil"},
    {"id": "15", "title": "Registo diário semanal", "description": "Registe todas as despesas durante 7 dias consecutivos.", "xp": 150, "difficulty": "Difícil"},
    {"id": "16", "title": "Kixikila completa", "description": "Complete um ciclo inteiro de kixikila com objectivo definido.", "xp": 200, "difficulty": "Difícil"},
]

# ---------------------------------------------------------------------------
# Learning Path modules — AI will personalize later
# ---------------------------------------------------------------------------

LEARNING_MODULES = [
    # Fundamentos (Level 1-3)
    {"id": "mod-1", "title": "Orçamento básico", "description": "Aprenda a criar e manter um orçamento mensal simples.", "lessons_count": 5, "level_required": 1, "tier": "Fundamentos"},
    {"id": "mod-2", "title": "Poupança inteligente", "description": "Estratégias práticas para começar a poupar, mesmo com pouco.", "lessons_count": 4, "level_required": 1, "tier": "Fundamentos"},
    {"id": "mod-3", "title": "Controlar dívidas", "description": "Como sair das dívidas e evitar cair nelas novamente.", "lessons_count": 4, "level_required": 2, "tier": "Fundamentos"},
    {"id": "mod-4", "title": "Hábitos financeiros", "description": "Construa rotinas diárias que protegem o seu dinheiro.", "lessons_count": 3, "level_required": 2, "tier": "Fundamentos"},
    {"id": "mod-5", "title": "Finanças em Angola", "description": "Entenda o sistema financeiro angolano: bancos, BNA, câmbio.", "lessons_count": 5, "level_required": 3, "tier": "Fundamentos"},
    # Intermédio (Level 4-6)
    {"id": "mod-6", "title": "Investimentos básicos", "description": "Depósitos a prazo, obrigações do tesouro e outras opções.", "lessons_count": 6, "level_required": 4, "tier": "Intermédio"},
    {"id": "mod-7", "title": "Impostos e obrigações", "description": "O que precisa saber sobre IRT, imposto industrial e mais.", "lessons_count": 4, "level_required": 4, "tier": "Intermédio"},
    {"id": "mod-8", "title": "Seguros essenciais", "description": "Quais seguros vale a pena ter e como escolher.", "lessons_count": 3, "level_required": 5, "tier": "Intermédio"},
    {"id": "mod-9", "title": "Finanças familiares", "description": "Gerir o dinheiro em casal e ensinar finanças aos filhos.", "lessons_count": 5, "level_required": 5, "tier": "Intermédio"},
    {"id": "mod-10", "title": "Negócio próprio", "description": "Finanças pessoais vs. finanças do negócio — separe e prospere.", "lessons_count": 4, "level_required": 6, "tier": "Intermédio"},
    # Avançado (Level 7-10)
    {"id": "mod-11", "title": "Diversificação de carteira", "description": "Distribua investimentos por diferentes classes de activos.", "lessons_count": 5, "level_required": 7, "tier": "Avançado"},
    {"id": "mod-12", "title": "Planeamento de reforma", "description": "Quanto precisa poupar para uma reforma confortável.", "lessons_count": 4, "level_required": 7, "tier": "Avançado"},
    {"id": "mod-13", "title": "Herança e sucessão", "description": "Como proteger o património e planear a sucessão familiar.", "lessons_count": 3, "level_required": 8, "tier": "Avançado"},
    {"id": "mod-14", "title": "Mercado cambial", "description": "Entenda o mercado de câmbio e proteja-se contra desvalorização.", "lessons_count": 4, "level_required": 9, "tier": "Avançado"},
    {"id": "mod-15", "title": "Riqueza geracional", "description": "Construa riqueza que transcende gerações.", "lessons_count": 5, "level_required": 10, "tier": "Avançado"},
]

# ---------------------------------------------------------------------------
# Achievements — user progress tracked via preferences
# ---------------------------------------------------------------------------

ACHIEVEMENTS = [
    {"id": "ach-1", "name": "Primeiro passo", "description": "Registar a primeira transacção.", "icon": "footprints", "xp_reward": 25},
    {"id": "ach-2", "name": "Orçamentista", "description": "Criar o primeiro orçamento.", "icon": "calculator", "xp_reward": 50},
    {"id": "ach-3", "name": "Poupador", "description": "Atingir uma meta de poupança.", "icon": "piggy-bank", "xp_reward": 100},
    {"id": "ach-4", "name": "Sem dívidas", "description": "Pagar todas as dívidas registadas.", "icon": "check-circle", "xp_reward": 200},
    {"id": "ach-5", "name": "Família unida", "description": "Criar uma família no O Financeiro.", "icon": "users", "xp_reward": 50},
    {"id": "ach-6", "name": "Investidor", "description": "Registar o primeiro investimento.", "icon": "trending-up", "xp_reward": 75},
    {"id": "ach-7", "name": "Maratonista", "description": "Registar despesas 30 dias seguidos.", "icon": "flame", "xp_reward": 200},
    {"id": "ach-8", "name": "Cinco estrelas", "description": "Atingir o nível 5.", "icon": "star", "xp_reward": 100},
    {"id": "ach-9", "name": "Explorador", "description": "Completar o primeiro módulo de aprendizagem.", "icon": "compass", "xp_reward": 50},
    {"id": "ach-10", "name": "Desafiante", "description": "Completar 5 desafios.", "icon": "zap", "xp_reward": 75},
    {"id": "ach-11", "name": "Mestre dos desafios", "description": "Completar todos os desafios.", "icon": "trophy", "xp_reward": 300},
    {"id": "ach-12", "name": "Estudante dedicado", "description": "Completar 3 módulos de aprendizagem.", "icon": "graduation-cap", "xp_reward": 150},
    {"id": "ach-13", "name": "Conta organizada", "description": "Criar 3 ou mais contas.", "icon": "wallet", "xp_reward": 50},
    {"id": "ach-14", "name": "Consistente", "description": "Registar despesas 7 dias seguidos.", "icon": "calendar-check", "xp_reward": 50},
    {"id": "ach-15", "name": "Veterano", "description": "Usar o O Financeiro durante 90 dias.", "icon": "award", "xp_reward": 200},
]


# ---------------------------------------------------------------------------
# Pydantic schemas for AI-ready endpoints
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    question: str


def _build_profile(prefs: dict) -> dict:
    """Build education profile from user preferences."""
    xp = prefs.get("xp", 0)
    level = xp // 100 + 1
    streak = prefs.get("streak_days", 0)
    badges = prefs.get("badges", [])
    return {
        "total_xp": xp,
        "level": level,
        "xp_to_next_level": (level * 100) - xp,
        "current_streak": streak,
        "longest_streak": prefs.get("longest_streak", streak),
        "badges": badges,
    }


def _build_learning_path(level: int, completed_modules: list[str]) -> list[dict]:
    """Build learning path based on user level."""
    return [
        {
            "id": m["id"],
            "title": m["title"],
            "description": m["description"],
            "lessons_count": m["lessons_count"],
            "completed_count": m["lessons_count"] if m["id"] in completed_modules else 0,
            "tier": m["tier"],
            "level_required": m["level_required"],
            "locked": level < m["level_required"],
        }
        for m in LEARNING_MODULES
    ]


def _build_achievements(prefs: dict) -> list[dict]:
    """Build achievements list with earned status from user preferences."""
    earned_achievements: dict[str, str] = prefs.get("earned_achievements", {})
    return [
        {
            "id": a["id"],
            "name": a["name"],
            "description": a["description"],
            "icon": a["icon"],
            "xp_reward": a["xp_reward"],
            "earned": a["id"] in earned_achievements,
            "earned_at": earned_achievements.get(a["id"]),
        }
        for a in ACHIEVEMENTS
    ]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def get_education_overview(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get combined education data: daily tip, challenges, profile, learning path, achievements."""
    today = date.today()
    tip_index = today.toordinal() % len(DAILY_TIPS)

    prefs = user.preferences or {}
    completed = prefs.get("completed_challenges", [])
    profile = _build_profile(prefs)

    return {
        "daily_tip": DAILY_TIPS[tip_index],
        "challenges": [
            {
                "id": c["id"],
                "title": c["title"],
                "description": c["description"],
                "xp_reward": c["xp"],
                "difficulty": c["difficulty"],
                "status": "completed" if c["id"] in completed else "pending",
            }
            for c in CHALLENGES
        ],
        "profile": profile,
        "learning_path": _build_learning_path(
            profile["level"],
            prefs.get("completed_modules", []),
        ),
        "achievements": _build_achievements(prefs),
    }


@router.get("/daily-tip")
async def get_daily_tip(user: User = Depends(get_current_user)) -> dict:
    """Get today's financial tip."""
    today = date.today()
    tip_index = today.toordinal() % len(DAILY_TIPS)
    return DAILY_TIPS[tip_index]


@router.get("/personalized-tip")
async def get_personalized_tip(
    user: User = Depends(get_current_user),
) -> dict:
    """Get a personalized financial tip (AI-ready: currently random).

    Future: AI will personalize based on spending patterns, goals, and user facts.
    """
    tip = random.choice(DAILY_TIPS)
    return {
        **tip,
        "ai_generated": False,
        "personalization_context": None,
    }


@router.get("/learning-path")
async def get_learning_path(
    user: User = Depends(get_current_user),
) -> dict:
    """Get structured learning path based on user level.

    Future: AI will recommend modules based on user's financial behaviour.
    """
    prefs = user.preferences or {}
    xp = prefs.get("xp", 0)
    level = xp // 100 + 1
    completed_modules = prefs.get("completed_modules", [])

    modules = _build_learning_path(level, completed_modules)

    # Group by tier
    tiers: dict[str, list[dict]] = {}
    for m in modules:
        tiers.setdefault(m["tier"], []).append(m)

    return {
        "current_level": level,
        "tiers": [
            {"name": name, "modules": tiers[name]}
            for name in ["Fundamentos", "Intermédio", "Avançado"]
            if name in tiers
        ],
        "ai_generated": False,
    }


@router.get("/achievements")
async def get_achievements(
    user: User = Depends(get_current_user),
) -> dict:
    """Get all possible achievements with earned status."""
    prefs = user.preferences or {}
    achievements = _build_achievements(prefs)
    earned_count = sum(1 for a in achievements if a["earned"])

    return {
        "achievements": achievements,
        "earned_count": earned_count,
        "total_count": len(achievements),
    }


@router.post("/ask")
async def ask_education(
    body: AskRequest,
    user: User = Depends(get_current_user),
) -> dict:
    """AI chatbot for financial education questions (skeleton).

    Future: routes to education AI agent for personalised answers.
    """
    return {
        "question": body.question,
        "answer": "Esta funcionalidade estará disponível em breve com integração IA. "
        "Enquanto isso, explore as dicas diárias e os módulos de aprendizagem.",
        "ai_generated": False,
        "sources": [],
    }


@router.get("/challenges")
async def get_challenges(user: User = Depends(get_current_user)) -> list[dict]:
    """Get available challenges."""
    prefs = user.preferences or {}
    completed = prefs.get("completed_challenges", [])
    return [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "xp_reward": c["xp"],
            "difficulty": c["difficulty"],
            "status": "completed" if c["id"] in completed else "pending",
        }
        for c in CHALLENGES
    ]


@router.get("/profile")
async def get_education_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get user's education profile: XP, level, badges, streaks."""
    prefs = user.preferences or {}
    profile = _build_profile(prefs)
    return {
        "xp": profile["total_xp"],
        "level": profile["level"],
        "streak_days": profile["current_streak"],
        "badges": profile["badges"],
        "next_level_xp": profile["level"] * 100,
        "xp_to_next": profile["xp_to_next_level"],
    }


@router.post("/challenges/{challenge_id}/complete")
async def complete_challenge(
    challenge_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Mark a challenge as completed and award XP."""
    challenge = next((c for c in CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Desafio não encontrado"},
        )

    prefs = dict(user.preferences or {})
    completed = prefs.get("completed_challenges", [])
    if challenge_id in completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ALREADY_COMPLETED", "message": "Desafio já foi completado"},
        )

    completed.append(challenge_id)
    xp = prefs.get("xp", 0) + challenge["xp"]
    prefs["completed_challenges"] = completed
    prefs["xp"] = xp
    user.preferences = prefs
    await db.flush()

    level = xp // 100 + 1
    return {
        "success": True,
        "xp_earned": challenge["xp"],
        "total_xp": xp,
        "level": level,
    }
