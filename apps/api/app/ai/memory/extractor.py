"""Memory Extractor — extracts facts from conversations using LLM + regex fallback.

Uses Claude Haiku for intelligent fact extraction. Falls back to regex
if LLM is not available. Extracts: salary, employer, bank, habits, preferences.
"""

import json
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.memory.facts import save_user_fact

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Analisa a mensagem do utilizador e extrai APENAS factos concretos sobre a sua vida financeira.

Retorna JSON com os factos encontrados. Se nao encontrares nenhum facto, retorna {}.

Factos possiveis:
- salary_day: dia do mes em que recebe salario (numero 1-31)
- salary_amount: valor do salario em Kz
- num_children: numero de filhos
- primary_bank: banco principal (BAI, BFA, BIC, etc.)
- rent_amount: valor da renda em Kz
- employer: nome da empresa onde trabalha
- spending_habit: habito de gasto detectado (ex: "gasta muito em transporte")
- preferred_category: categoria que mais usa (ex: "alimentacao")
- financial_goal: objectivo financeiro mencionado (ex: "comprar carro")

Responde APENAS com JSON valido. Exemplo:
{"salary_day": "25", "employer": "Sonangol"}

Mensagem do utilizador:"""

# Regex fallback patterns
REGEX_PATTERNS = [
    (r"(?:recebo|sal[aá]rio|ordenado).*?dia\s+(\d{1,2})", "salary_day"),
    (r"tenho\s+(\d+)\s+filh[oa]s?", "num_children"),
    (r"tenho\s+um\s+filh[oa]", "num_children"),
    (r"(?:conta|banco|uso)\s+(?:no|o|e)\s+(BAI|BFA|BIC|BPC|Standard\s*Bank)", "primary_bank"),
    (r"renda\s+(?:de\s+)?(\d[\d.]*)\s*(?:kz|kwanzas?)?", "rent_amount"),
    (r"trabalho\s+(?:na|no|em)\s+([\w\s]+?)(?:\.|,|$)", "employer"),
]


async def extract_facts_from_message(
    db: AsyncSession,
    user_id,
    message: str,
) -> list[dict]:
    """Extract facts from a user message using LLM with regex fallback."""
    if len(message) < 10:
        return []

    # Try LLM extraction first
    extracted = await _extract_with_llm(message)

    # Fall back to regex if LLM didn't find anything or is unavailable
    if not extracted:
        extracted = _extract_with_regex(message)

    # Save extracted facts
    saved = []
    for fact_key, fact_value in extracted.items():
        if fact_value and str(fact_value).strip():
            await save_user_fact(db, user_id, fact_key, str(fact_value).strip())
            saved.append({"fact_key": fact_key, "fact_value": str(fact_value)})
            logger.info("Extracted fact: %s = %s for user %s", fact_key, fact_value, user_id)

    return saved


async def _extract_with_llm(message: str) -> dict:
    """Use Claude Haiku to extract facts from a message."""
    try:
        from app.ai.llm.factory import create_llm_router
        from app.ai.llm.base import LLMMessage
        from app.ai.llm.router import TaskType

        router = create_llm_router()
        if not router.get_available_providers():
            return {}

        response = await router.chat(
            task=TaskType.MEMORY_EXTRACTION,
            messages=[
                LLMMessage(role="user", content=f"{EXTRACTION_PROMPT}\n\n{message}"),
            ],
            temperature=0.0,
            max_tokens=200,
        )

        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        facts = json.loads(content)
        if isinstance(facts, dict):
            return {k: v for k, v in facts.items() if v and str(v).strip()}
        return {}
    except (json.JSONDecodeError, RuntimeError, Exception):
        return {}


def _extract_with_regex(message: str) -> dict:
    """Regex-based fallback for fact extraction."""
    extracted = {}
    text = message.lower()

    for pattern, fact_key in REGEX_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if fact_key == "num_children" and value == "":
                value = "1"
            if value:
                extracted[fact_key] = value

    return extracted
