"""Memory Extractor — extracts facts from conversations asynchronously."""

import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.memory.facts import save_user_fact

logger = logging.getLogger(__name__)

# Patterns to detect facts in user messages
FACT_PATTERNS = [
    # Salary day: "recebo dia 25", "o meu salário cai dia 28"
    (r"(?:recebo|sal[aá]rio|ordenado).*?dia\s+(\d{1,2})", "salary_day"),
    # Children: "tenho 2 filhos", "tenho um filho"
    (r"tenho\s+(\d+)\s+filh[oa]s?", "num_children"),
    (r"tenho\s+um\s+filh[oa]", "num_children"),
    # Bank: "a minha conta é no BAI", "uso o BFA"
    (r"(?:conta|banco|uso)\s+(?:no|o|é)\s+(BAI|BFA|BIC|BPC|Standard\s*Bank|MCX|Multicaixa)", "primary_bank"),
    # Rent: "pago 150000 de renda", "renda de 200K"
    (r"renda\s+(?:de\s+)?(\d[\d.]*)\s*(?:kz|kwanzas?)?", "rent_amount"),
    # Employer: "trabalho na Sonangol", "trabalho no BAI"
    (r"trabalho\s+(?:na|no|em)\s+([\w\s]+?)(?:\.|,|$)", "employer"),
]


async def extract_facts_from_message(
    db: AsyncSession,
    user_id,
    message: str,
) -> list[dict]:
    """Extract facts from a user message and save them.
    Returns list of extracted facts.
    """
    extracted = []
    text = message.lower()

    for pattern, fact_key in FACT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()

            # Special handling for "um filho" → "1"
            if fact_key == "num_children" and value == "":
                value = "1"

            if value:
                await save_user_fact(db, user_id, fact_key, value)
                extracted.append({"fact_key": fact_key, "fact_value": value})
                logger.info("Extracted fact: %s = %s for user %s", fact_key, value, user_id)

    return extracted
