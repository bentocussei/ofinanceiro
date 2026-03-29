"""Rule-based transaction categorization (Phase 0, without AI)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category

# Keyword → category slug mapping for Angola context
KEYWORD_RULES: list[tuple[list[str], str]] = [
    # Alimentação
    (["supermercado", "kero", "shoprite", "candando", "maxi"], "Supermercado"),
    (["mercado", "praça", "zungueira", "quitanda"], "Mercado informal"),
    (["restaurante", "almoço", "jantar", "refeição"], "Restaurante"),
    (["take-away", "delivery", "tupuca", "glovo"], "Take-away / Delivery"),
    (["padaria", "pão"], "Padaria"),

    # Casa
    (["renda", "aluguer", "senhorio"], "Renda / Prestação"),
    (["condomínio", "condominio"], "Condomínio"),
    (["epal", "água"], "Água (EPAL)"),
    (["ende", "edel", "electricidade", "luz"], "Electricidade (ENDE/EDEL)"),
    (["gás", "gas"], "Gás"),
    (["internet", "net one", "tv cabo", "zap", "dstv"], "Internet"),
    (["empregada", "doméstica"], "Empregada doméstica"),

    # Transporte
    (["gasolina", "gasóleo", "combustível", "bomba", "sonangol", "pumangol"], "Gasóleo / Gasolina"),
    (["candongueiro", "kupapata", "hiace"], "Candongueiro / Kupapata"),
    (["heetch", "kubinga", "táxi", "taxi", "uber"], "Táxi / HEETCH / Kubinga"),
    (["oficina", "mecânico", "pneu", "óleo"], "Manutenção automóvel"),
    (["seguro auto", "ensa"], "Seguro automóvel"),
    (["lavagem", "car wash"], "Lavagem automóvel"),

    # Filhos
    (["propina", "escola", "colégio", "colegio"], "Propina escolar"),
    (["material escolar", "caderno", "lápis", "mochila"], "Material escolar"),
    (["uniforme"], "Uniforme"),
    (["mesada"], "Mesada"),

    # Saúde
    (["médico", "consulta", "clínica", "hospital"], "Consulta médica"),
    (["farmácia", "medicamento", "remédio"], "Medicamentos"),
    (["dentista"], "Dentista"),

    # Comunicações
    (["unitel", "movicel", "recarga", "saldo"], "Recarga Unitel / Movicel"),

    # Transferências
    (["kixikila"], "Kixikila (contribuição)"),
    (["dízimo", "dizimo", "igreja", "oferta"], "Dízimo / Igreja"),

    # Receitas
    (["salário", "salario", "ordenado", "vencimento"], "Salário"),
    (["freelance", "biscate", "serviço"], "Freelance"),
]


async def suggest_category(
    db: AsyncSession, description: str, merchant: str | None = None
) -> uuid.UUID | None:
    """Suggest a category based on keywords in description/merchant.
    Returns category_id or None if no match.
    """
    text = f"{description or ''} {merchant or ''}".lower()

    matched_name = None
    for keywords, category_name in KEYWORD_RULES:
        if any(kw in text for kw in keywords):
            matched_name = category_name
            break

    if not matched_name:
        return None

    result = await db.execute(
        select(Category.id)
        .where(Category.name == matched_name, Category.is_system.is_(True))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row
